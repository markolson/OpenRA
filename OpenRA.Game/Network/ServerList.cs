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
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using OpenRA.FileFormats;

using Lidgren.Network;


namespace OpenRA.Network
{
	public static class ServerList
	{
		static NetClient searcher;
		static Action<GameServer[]> callback;
		public static void Query(Action<GameServer[]> onComplete)
		{
			var masterServerUrl = Game.Settings.Server.MasterServer;

			new Thread(() =>
			{
				GameServer[] games = null;
				try
				{
					var str = GetData(new Uri(masterServerUrl + "list.php"));

					var yaml = MiniYaml.FromString(str);

					games = yaml.Select(a => FieldLoader.Load<GameServer>(a.Value))
						.Where(gs => gs.Address != null).ToArray();
				}
				catch { }

				Game.RunAfterTick(() => onComplete(games));
			}) { IsBackground = true }.Start();
		}

		public static void SearchLocal(Action<GameServer[]> onComplete)
		{
			if(searcher == null)
			{
				callback = onComplete;
				SynchronizationContext.SetSynchronizationContext(new SynchronizationContext());
				NetPeerConfiguration config = new NetPeerConfiguration("OpenRA");
				searcher = new NetClient(config);
				searcher.RegisterReceivedCallback(new SendOrPostCallback(GotMessage)); 
				SynchronizationContext.SetSynchronizationContext(null);
				searcher.Start();
			}
			searcher.DiscoverLocalPeers(14242);
		}
		
		static void GotMessage(object peer)
		{
			NetIncomingMessage im;
			while ((im = searcher.ReadMessage()) != null)
			{
				// handle incoming message
				switch (im.MessageType)
				{
			        case NetIncomingMessageType.DiscoveryResponse:
						var yaml = MiniYaml.FromString(im.ReadString());
						var games = yaml.Select(a => FieldLoader.Load<GameServer>(a.Value))
							.Where(gs => gs.Address != null).ToArray();
						foreach(var g in games) 
						{
							g.Address = "{0}:{1}".F(im.SenderEndpoint.Address.ToString(), g.Address.Split(':')[1]);
							g.Local = true;
						}
						callback(games);
			            break;
					default:
						break;
				}
			}
		}
		

		static string GetData(Uri uri)
		{
			var wc = new WebClient();
			wc.Proxy = null;
			var data = wc.DownloadData(uri);
			return Encoding.UTF8.GetString(data);
		}
	}
}
