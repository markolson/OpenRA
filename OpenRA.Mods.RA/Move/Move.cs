#region Copyright & License Information
/*
 * Copyright 2007-2011 The OpenRA Developers (see AUTHORS)
 * This file is part of OpenRA, which is free software. It is made
 * available to you under the terms of the GNU General Public License
 * as published by the Free Software Foundation. For more information,
 * see COPYING.
 */
#endregion

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using OpenRA.FileFormats;
using OpenRA.Mods.RA.Activities;
using OpenRA.Traits;

namespace OpenRA.Mods.RA.Move
{
	class Move : Activity
	{
		CPos? destination;
		int nearEnough;
		public List<CPos> path;
		Func<Actor, Mobile, List<CPos>> getPath;
		public Actor ignoreBuilding;

		// Scriptable move order
		// Ignores lane bias and nearby units
		public Move(CPos destination)
		{
			this.getPath = (self,mobile) =>
				self.World.WorldActor.Trait<PathFinder>().FindPath(
					PathSearch.FromPoint( self.World, mobile.Info, self, mobile.toCell, destination, false )
					.WithoutLaneBias());
			this.destination = destination;
			this.nearEnough = 0;
		}

		public Move(CPos destination, int nearEnough)
		{
			this.getPath = (self,mobile) => self.World.WorldActor.Trait<PathFinder>().FindUnitPath( mobile.toCell, destination, self );
			this.destination = destination;
			this.nearEnough = nearEnough;
		}

		public Move(CPos destination, Actor ignoreBuilding)
		{
			this.getPath = (self,mobile) =>
				self.World.WorldActor.Trait<PathFinder>().FindPath(
					PathSearch.FromPoint( self.World, mobile.Info, self, mobile.toCell, destination, false )
					.WithIgnoredBuilding( ignoreBuilding ));

			this.destination = destination;
			this.nearEnough = 0;
			this.ignoreBuilding = ignoreBuilding;
		}

		public Move(Target target, int range)
		{
			this.getPath = (self,mobile) => self.World.WorldActor.Trait<PathFinder>().FindUnitPathToRange(
				mobile.toCell, target.CenterLocation.ToCPos(),
				range, self);
			this.destination = null;
			this.nearEnough = range;
		}

		public Move(Func<List<CPos>> getPath)
		{
			this.getPath = (_1,_2) => getPath();
			this.destination = null;
			this.nearEnough = 0;
		}

		static int HashList<T>(List<T> xs)
		{
			int hash = 0;
			int n = 0;
			foreach (var x in xs)
				hash += n++ * x.GetHashCode();

			return hash;
		}

		List<CPos> EvalPath(Actor self, Mobile mobile)
		{
			var path = getPath(self, mobile).TakeWhile(a => a != mobile.toCell).ToList();
			mobile.PathHash = HashList(path);
			return path;
		}

		public override Activity Tick( Actor self )
		{
			var mobile = self.Trait<Mobile>();
			var info = self.Info.Traits.Get<MobileInfo>();

			if (mobile.Altitude != info.Altitude)
			{
				if (mobile.Altitude < info.Altitude)
					++mobile.Altitude;
				return this;
			}

			if (destination == mobile.toCell)
				return NextActivity;

			if( path == null )
			{
				if (mobile.ticksBeforePathing > 0)
				{
					--mobile.ticksBeforePathing;
					return this;
				}

				path = EvalPath(self, mobile);
				SanityCheckPath( mobile );
			}

			if( path.Count == 0 )
			{
				destination = mobile.toCell;
				return this;
			}

			destination = path[ 0 ];

			var nextCell = PopPath( self, mobile );
			if( nextCell == null )
				return this;

			var dir = nextCell.Value.First - mobile.fromCell;
			var firstFacing = Util.GetFacing( dir, mobile.Facing );
			if( firstFacing != mobile.Facing )
			{
				path.Add( nextCell.Value.First );
				return Util.SequenceActivities( new Turn( firstFacing ), this );
			}
			else
			{
				mobile.SetLocation( mobile.fromCell, mobile.fromSubCell, nextCell.Value.First, nextCell.Value.Second );
				var move = new MoveFirstHalf(
					this,
					Util.CenterOfCell( mobile.fromCell ) + mobile.Info.SubCellOffsets[mobile.fromSubCell],
					Util.BetweenCells( mobile.fromCell, mobile.toCell ) + (mobile.Info.SubCellOffsets[mobile.fromSubCell] + mobile.Info.SubCellOffsets[mobile.toSubCell] ) / 2,
					mobile.Facing,
					mobile.Facing,
					0 );

				return move;
			}
		}

		[Conditional( "SANITY_CHECKS")]
		void SanityCheckPath( Mobile mobile )
		{
			if( path.Count == 0 )
				return;
			var d = path[path.Count-1] - mobile.toCell;
			if( d.LengthSquared > 2 )
				throw new InvalidOperationException( "(Move) Sanity check failed" );
		}

		bool hasWaited;
		bool hasNotifiedBlocker;
		int waitTicksRemaining;

		void NotifyBlocker(Actor self, CPos nextCell)
		{
			foreach (var blocker in self.World.ActorMap.GetUnitsAt(nextCell))
			{
				Log.Write("debug", "NotifyBlocker #{0} nudges #{1} at {2} from {3}",
					self.ActorID, blocker.ActorID, nextCell, self.Location);

				// Notify the blocker that he's blocking our move:
				var moveBlocked = blocker.TraitOrDefault<INotifyBlockingMove>();
				if (moveBlocked != null)
					moveBlocked.OnNotifyBlockingMove(blocker, self);
			}
		}

		Pair<CPos, SubCell>? PopPath(Actor self, Mobile mobile)
		{
			if( path.Count == 0 ) return null;
			var nextCell = path[ path.Count - 1 ];
			if( !mobile.CanEnterCell( nextCell, ignoreBuilding, true ) )
			{
				if( ( mobile.toCell - destination.Value ).LengthSquared <= nearEnough )
				{
					path.Clear();
					return null;
				}

				if (!hasNotifiedBlocker)
				{
					NotifyBlocker(self, nextCell);
					hasNotifiedBlocker = true;
				}

				if (!hasWaited)
				{
					var info = self.Info.Traits.Get<MobileInfo>();
					waitTicksRemaining = info.WaitAverage + self.World.SharedRandom.Next(-info.WaitSpread, info.WaitSpread);
					hasWaited = true;
				}

				if (--waitTicksRemaining >= 0)
					return null;

				if (mobile.ticksBeforePathing > 0)
				{
					--mobile.ticksBeforePathing;
					return null;
				}

				mobile.RemoveInfluence();
				var newPath = EvalPath(self, mobile);
				mobile.AddInfluence();

				if (newPath.Count != 0)
					path = newPath;

				return null;
			}
			hasNotifiedBlocker = false;
			hasWaited = false;
			path.RemoveAt( path.Count - 1 );

			var subCell = mobile.GetDesiredSubcell(nextCell, ignoreBuilding);
			return Pair.New(nextCell, subCell);
		}

		public override void Cancel( Actor self )
		{
			path = new List<CPos>(0);
			base.Cancel(self);
		}

		public override IEnumerable<Target> GetTargets( Actor self )
		{
			if( path != null )
				return Enumerable.Reverse(path).Select( c => Target.FromCell(c) );
			if( destination != null )
				return new Target[] { Target.FromCell(destination.Value) };
			return Target.NoTargets;
		}

		abstract class MovePart : Activity
		{
			public readonly Move move;
			public readonly PPos from, to;
			public readonly int fromFacing, toFacing;
			public int moveFraction;
			public readonly int moveFractionTotal;

			public MovePart(Move move, PPos from, PPos to, int fromFacing, int toFacing, int startingFraction)
			{
				this.move = move;
				this.from = from;
				this.to = to;
				this.fromFacing = fromFacing;
				this.toFacing = toFacing;
				this.moveFraction = startingFraction;
				this.moveFractionTotal = ( ( to - from ) * 3 ).Length;
			}

			public override void Cancel( Actor self )
			{
				move.Cancel( self );
				base.Cancel( self );
			}

			public override void Queue( Activity activity )
			{
				move.Queue( activity );
			}

			public override Activity Tick( Actor self )
			{
				var mobile = self.Trait<Mobile>();
				var ret = InnerTick( self, mobile );
				mobile.IsMoving = ( ret is MovePart );

				if( moveFraction > moveFractionTotal )
					moveFraction = moveFractionTotal;
				UpdateCenterLocation( self, mobile );

				return ret;
			}

			Activity InnerTick( Actor self, Mobile mobile )
			{
				moveFraction += mobile.MovementSpeedForCell(self, mobile.toCell);
				if( moveFraction <= moveFractionTotal )
					return this;

				var next = OnComplete( self, mobile, move );
				if( next != null )
					return next;

				return move;
			}

			void UpdateCenterLocation( Actor self, Mobile mobile )
			{
				mobile.PxPosition = PPos.Lerp(from, to, moveFraction, moveFractionTotal);

				if( moveFraction >= moveFractionTotal )
					mobile.Facing = toFacing & 0xFF;
				else
					mobile.Facing = int2.Lerp( fromFacing, toFacing, moveFraction, moveFractionTotal ) & 0xFF;
			}

			protected abstract MovePart OnComplete( Actor self, Mobile mobile, Move parent );

			public override IEnumerable<Target> GetTargets( Actor self )
			{
				return move.GetTargets(self);
			}
		}

		class MoveFirstHalf : MovePart
		{
			public MoveFirstHalf(Move move, PPos from, PPos to, int fromFacing, int toFacing, int startingFraction)
				: base( move, from, to, fromFacing, toFacing, startingFraction ) { }

			static bool IsTurn( Mobile mobile, CPos nextCell )
			{
				return nextCell - mobile.toCell !=
					mobile.toCell - mobile.fromCell;
			}

			protected override MovePart OnComplete( Actor self, Mobile mobile, Move parent )
			{
				var fromSubcellOffset = mobile.Info.SubCellOffsets[mobile.fromSubCell];
				var toSubcellOffset = mobile.Info.SubCellOffsets[mobile.toSubCell];

				var nextCell = parent.PopPath( self, mobile );
				if( nextCell != null )
				{
					if(IsTurn(mobile, nextCell.Value.First))
					{
						var nextSubcellOffset = mobile.Info.SubCellOffsets[nextCell.Value.Second];
						var ret = new MoveFirstHalf(
							move,
							Util.BetweenCells( mobile.fromCell, mobile.toCell ) + (fromSubcellOffset + toSubcellOffset) / 2,
							Util.BetweenCells( mobile.toCell, nextCell.Value.First ) + (toSubcellOffset + nextSubcellOffset) / 2,
							mobile.Facing,
							Util.GetNearestFacing( mobile.Facing, Util.GetFacing( nextCell.Value.First - mobile.toCell, mobile.Facing ) ),
							moveFraction - moveFractionTotal );

						mobile.SetLocation( mobile.toCell, mobile.toSubCell, nextCell.Value.First, nextCell.Value.Second);
						return ret;
					}

					parent.path.Add( nextCell.Value.First );
				}

				var ret2 = new MoveSecondHalf(
					move,
					Util.BetweenCells( mobile.fromCell, mobile.toCell ) + (fromSubcellOffset + toSubcellOffset) / 2,
					Util.CenterOfCell( mobile.toCell ) + toSubcellOffset,
					mobile.Facing,
					mobile.Facing,
					moveFraction - moveFractionTotal );

				mobile.EnteringCell(self);
				mobile.SetLocation( mobile.toCell, mobile.toSubCell, mobile.toCell, mobile.toSubCell );
				return ret2;
			}
		}

		class MoveSecondHalf : MovePart
		{
			public MoveSecondHalf(Move move, PPos from, PPos to, int fromFacing, int toFacing, int startingFraction)
				: base( move, from, to, fromFacing, toFacing, startingFraction )
			{
			}

			protected override MovePart OnComplete( Actor self, Mobile mobile, Move parent )
			{
				mobile.PxPosition = Util.CenterOfCell( mobile.toCell );
				mobile.SetLocation( mobile.toCell, mobile.toSubCell, mobile.toCell, mobile.toSubCell );
				mobile.FinishedMoving(self);
				return null;
			}
		}
	}

	public static class ActorExtensionsForMove
	{
		public static bool IsMoving(this Actor self)
		{
			if (self.IsIdle) return false;

			Activity a = self.GetCurrentActivity();
			Debug.Assert(a != null);

			// Dirty, but it suffices until we do something better:
			if (a.GetType() == typeof(Move)) return true;
			if (a.GetType() == typeof(MoveAdjacentTo)) return true;
			if (a.GetType() == typeof(AttackMove)) return true;

			// Not a move:
			return false;
		}
	}
}
