#region Copyright & License Information
/*
 * Copyright 2007-2011 The OpenRA Developers (see AUTHORS)
 * This file is part of OpenRA, which is free software. It is made
 * available to you under the terms of the GNU General Public License
 * as published by the Free Software Foundation. For more information,
 * see COPYING.
 */
#endregion

using OpenRA.Traits;
using OpenRA.Widgets;
using System.Drawing;

namespace OpenRA.Mods.RA.Widgets.Logic
{
	public class IngameObserverChromeLogic
	{
		Widget gameRoot;

		// WTF duplication
		[ObjectCreator.UseCtor]
		public IngameObserverChromeLogic(World world)
		{
			Game.AddChatLine += AddChatLine;
			Game.BeforeGameStart += UnregisterEvents;

			var r = Ui.Root;
			gameRoot = r.GetWidget("OBSERVER_ROOT");
			var optionsBG = gameRoot.GetWidget("INGAME_OPTIONS_BG");

			r.GetWidget<ButtonWidget>("INGAME_OPTIONS_BUTTON").OnClick = () =>
				optionsBG.Visible = !optionsBG.Visible;

			optionsBG.GetWidget<ButtonWidget>("DISCONNECT").OnClick = () =>
			{
				optionsBG.Visible = false;
				Game.Disconnect();
				Game.LoadShellMap();
				Ui.CloseWindow();
				Ui.OpenWindow("MAINMENU_BG");
			};

			optionsBG.GetWidget<ButtonWidget>("SETTINGS").OnClick = () => Ui.OpenWindow("SETTINGS_MENU");
			optionsBG.GetWidget<ButtonWidget>("MUSIC").OnClick = () => Ui.OpenWindow("MUSIC_MENU");
			optionsBG.GetWidget<ButtonWidget>("RESUME").OnClick = () => optionsBG.Visible = false;
			optionsBG.GetWidget<ButtonWidget>("SURRENDER").IsVisible = () => false;
		}

		void UnregisterEvents()
		{
			Game.AddChatLine -= AddChatLine;
			Game.BeforeGameStart -= UnregisterEvents;
		}

		void AddChatLine(Color c, string from, string text)
		{
			gameRoot.GetWidget<ChatDisplayWidget>("CHAT_DISPLAY").AddLine(c, from, text);
		}
	}
}
