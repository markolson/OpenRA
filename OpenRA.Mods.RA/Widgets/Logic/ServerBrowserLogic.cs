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
using System.Linq;
using System.Drawing;
using OpenRA.FileFormats;
using OpenRA.Network;
using OpenRA.Widgets;
using System.Threading;
using Lidgren.Network;

namespace OpenRA.Mods.RA.Widgets.Logic
{
	public class ServerBrowserLogic
	{
		GameServer currentServer;
		ScrollItemWidget serverTemplate;
		public static Widget panel;

		enum SearchStatus { Fetching, Failed, NoGames, Hidden }
		SearchStatus searchStatus = SearchStatus.Fetching;
		public static NetClient searcher;

		public string ProgressLabelText()
		{
			switch (searchStatus)
			{
				case SearchStatus.Fetching:	return "Fetching game list...";
				case SearchStatus.Failed:	return "Failed to contact master server.";
				case SearchStatus.NoGames:	return "No games found.";
				default:					return "";
			}
		}
		
		[ObjectCreator.UseCtor]
		public ServerBrowserLogic(Widget widget, Action openLobby, Action onExit)
		{
			panel = widget;
			var sl = panel.GetWidget<ScrollPanelWidget>("SERVER_LIST");

			// Menu buttons
			var refreshButton = panel.GetWidget<ButtonWidget>("REFRESH_BUTTON");
			refreshButton.IsDisabled = () => searchStatus == SearchStatus.Fetching;
			refreshButton.OnClick = () =>
			{
				searchStatus = SearchStatus.Fetching;
				sl.RemoveChildren();
				currentServer = null;
				ServerList.Query(games => RefreshServerList(panel, games));
			};

			var join = panel.GetWidget<ButtonWidget>("JOIN_BUTTON");
			join.IsDisabled = () => currentServer == null || !currentServer.CanJoin();
			join.OnClick = () =>
			{
				if (currentServer == null)
					return;

				var host = currentServer.Address.Split(':')[0];
				var port = int.Parse(currentServer.Address.Split(':')[1]);

				Ui.CloseWindow();
				ConnectionLogic.Connect(host, port, openLobby, onExit);
			};

			panel.GetWidget<ButtonWidget>("BACK_BUTTON").OnClick = () => { Ui.CloseWindow(); onExit(); };

			// Server list
			serverTemplate = sl.GetWidget<ScrollItemWidget>("SERVER_TEMPLATE");

			// Display the progress label over the server list
			// The text is only visible when the list is empty
			var progressText = panel.GetWidget<LabelWidget>("PROGRESS_LABEL");
			progressText.IsVisible = () => searchStatus != SearchStatus.Hidden;
			progressText.GetText = ProgressLabelText;

			//ServerList.Query(games => RefreshServerList(panel, games));

			var context = new SynchronizationContext();
			// set this context for this thread.
			SynchronizationContext.SetSynchronizationContext(context);
			
			NetPeerConfiguration config = new NetPeerConfiguration("OpenRA");
			config.EnableMessageType(NetIncomingMessageType.DiscoveryResponse);
			config.EnableMessageType(NetIncomingMessageType.DebugMessage);
			config.AutoFlushSendQueue = false;
			searcher = new NetClient(config);
			Log.Write("debug", "Thread {0} {1}", System.Threading.Thread.CurrentThread.ManagedThreadId, SynchronizationContext.Current);
			searcher.RegisterReceivedCallback(new SendOrPostCallback(this.GotMessage)); 
			SynchronizationContext.SetSynchronizationContext(null);
			searcher.Start();
			searcher.DiscoverLocalPeers(14242);
		}

		public void GotMessage(object peer)
		{
			NetIncomingMessage im;
			while ((im = searcher.ReadMessage()) != null)
			{
				// handle incoming message
				switch (im.MessageType)
				{
			        case NetIncomingMessageType.DiscoveryResponse:
			            Log.Write("debug", "Found server at " + im.SenderEndpoint);
						var str = im.ReadString();
						var yaml = MiniYaml.FromString(str);

						var games = yaml.Select(a => FieldLoader.Load<GameServer>(a.Value))
							.Where(gs => gs.Address != null).ToArray();
						foreach(var g in games) 
						{
							g.Address = im.SenderEndpoint.Address.ToString();
						}
						RefreshServerList(panel, games);
			            break;
					case NetIncomingMessageType.VerboseDebugMessage:
						break;
					case NetIncomingMessageType.StatusChanged:
						NetConnectionStatus status = (NetConnectionStatus)im.ReadByte();
						string reason = im.ReadString();
						Log.Write("debug", "StatusChanged: {0}", reason);
						break;
					case NetIncomingMessageType.Data:
						string data = im.ReadString();
						Log.Write("debug", "Data: {0}", data);
						break;
					default:
						break;
				}
			}
		}


		string GetPlayersLabel(GameServer game)
		{
			if (game == null || game.Players == 0)
				return "";

			var map = Game.modData.FindMapByUid(game.Map);

			var maxPlayers = map == null ? "?" : (object)map.PlayerCount;
			return "{0} / {1}".F(game.Players, maxPlayers);
		}

		string GetStateLabel(GameServer game)
		{
			if (game == null)
				return "";

			if (game.State == 1) return "Waiting for players";
			if (game.State == 2) return "Playing";
			else return "Unknown";
		}

		Map GetMapPreview(GameServer game)
		{
			return (game == null) ? null : Game.modData.FindMapByUid(game.Map);
		}

		static string GenerateModLabel(KeyValuePair<string,string> mod)
		{
			if (Mod.AllMods.ContainsKey(mod.Key))
				return "{0} ({1})".F(Mod.AllMods[mod.Key].Title, mod.Value);

			return "Unknown Mod: {0}".F(mod.Key);
		}

		public static string GenerateModsLabel(GameServer s)
		{
			return s.UsefulMods.Select(m => GenerateModLabel(m)).JoinWith("\n");
		}

		public void RefreshServerList(Widget panel, IEnumerable<GameServer> games)
		{
			var sl = panel.GetWidget<ScrollPanelWidget>("SERVER_LIST");

			sl.RemoveChildren();
			currentServer = null;

			if (games == null)
			{
				searchStatus = SearchStatus.Failed;
				return;
			}

			if (games.Count() == 0)
			{
				searchStatus = SearchStatus.NoGames;
				return;
			}

			searchStatus = SearchStatus.Hidden;
			currentServer = games.FirstOrDefault();

			foreach (var loop in games)
			{
				var game = loop;

				var canJoin = game.CanJoin();

				var item = ScrollItemWidget.Setup(serverTemplate, () => currentServer == game, () => currentServer = game);

				var preview = item.GetWidget<MapPreviewWidget>("MAP_PREVIEW");
				preview.Map = () => GetMapPreview(game);
				preview.IsVisible = () => GetMapPreview(game) != null;

				var title = item.GetWidget<LabelWidget>("TITLE");
				title.GetText = () => game.Name;

				// TODO: Use game.MapTitle once the server supports it
				var maptitle = item.GetWidget<LabelWidget>("MAP");
				maptitle.GetText = () =>
				{
					var map = Game.modData.FindMapByUid(game.Map);
					return map == null ? "Unknown Map" : map.Title;
				};

				// TODO: Use game.MaxPlayers once the server supports it
				var players = item.GetWidget<LabelWidget>("PLAYERS");
				players.GetText = () => GetPlayersLabel(game);

				var state = item.GetWidget<LabelWidget>("STATE");
				state.GetText = () => GetStateLabel(game);
	
				var ip = item.GetWidget<LabelWidget>("IP");
				ip.GetText = () => game.Address;

				var version = item.GetWidget<LabelWidget>("VERSION");
				version.GetText = () => GenerateModsLabel(game);
				version.IsVisible = () => !game.CompatibleVersion();

				if (!canJoin)
				{
					title.GetColor = () => Color.Gray;
					maptitle.GetColor = () => Color.Gray;
					players.GetColor = () => Color.Gray;
					state.GetColor = () => Color.Gray;
					ip.GetColor = () => Color.Gray;
					version.GetColor = () => Color.Gray;
				}

				sl.AddChild(item);
			}
		}
	}
}
