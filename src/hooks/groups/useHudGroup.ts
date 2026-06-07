import { CatalogGroupsComposer, DesktopViewEvent, GetGuestRoomResultEvent, GuildMembershipsMessageEvent, HabboGroupEntryData, RoomEntryInfoMessageEvent } from '@nitrots/nitro-renderer';
import { useEffect, useState } from 'react';
import { useBetween } from 'use-between';
import { LocalStorageKeys, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useLocalStorage } from '../useLocalStorage';

export interface HudRoomGroup
{
    id: number;
    badge: string;
    name: string;
}

// Stato condiviso per il badge gruppo nel HUD del borsellino.
//  - roomGroup: il gruppo della stanza-home in cui ti trovi ORA (priorità massima),
//    ricavato da GetGuestRoomResultEvent; azzerato all'uscita (RoomEntryInfo/DesktopView).
//  - groups: la lista dei gruppi dell'utente, caricata in modo ROBUSTO via
//    CatalogGroupsComposer → GuildMembershipsMessageEvent (useMessageEvent, non query
//    fragili) così il badge "pinnato" funziona anche FUORI dalle stanze-gruppo.
//  - pinnedGroupId: il gruppo scelto per il HUD (localStorage), usato quando NON sei
//    nella home di un gruppo.
const useHudGroupStore = () =>
{
    const [ pinnedGroupId, setPinnedGroupId ] = useLocalStorage<number>(LocalStorageKeys.HUD_GROUP_ID, 0);
    const [ roomGroup, setRoomGroup ] = useState<HudRoomGroup>(null);
    const [ groups, setGroups ] = useState<HabboGroupEntryData[]>([]);

    useMessageEvent<GuildMembershipsMessageEvent>(GuildMembershipsMessageEvent, event =>
    {
        const list = event.getParser()?.groups;

        if(list) setGroups(list);
    });

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, event =>
    {
        const parser = event.getParser();

        if(!parser.roomEnter) return;

        if(parser.data.habboGroupId > 0)
        {
            setRoomGroup({ id: parser.data.habboGroupId, badge: parser.data.groupBadgeCode, name: parser.data.groupName });
        }
        else
        {
            setRoomGroup(null);
        }
    });

    useMessageEvent<RoomEntryInfoMessageEvent>(RoomEntryInfoMessageEvent, () => setRoomGroup(null));
    useMessageEvent<DesktopViewEvent>(DesktopViewEvent, () => setRoomGroup(null));

    useEffect(() =>
    {
        SendMessageComposer(new CatalogGroupsComposer());
    }, []);

    return { roomGroup, pinnedGroupId, setPinnedGroupId, groups };
};

export const useHudGroup = () => useBetween(useHudGroupStore);
