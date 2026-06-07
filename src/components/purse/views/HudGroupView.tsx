import { FC, useMemo, useState } from 'react';
import { FaCog } from 'react-icons/fa';
import { GetGroupInformation } from '../../../api';
import { LayoutBadgeImageView } from '../../../common';
import { useHudGroup } from '../../../hooks';

const badgeClassNames = [ 'w-full!', 'h-full!', 'bg-contain!' ];
const badgeStyle = { width: '100%', height: '100%', backgroundSize: 'contain' } as const;

export const HudGroupView: FC<{}> = () =>
{
    const { roomGroup, pinnedGroupId, setPinnedGroupId, groups } = useHudGroup();
    const [ pickerOpen, setPickerOpen ] = useState(false);

    // Ordine di importanza: preferito per primo, poi alfabetico.
    const orderedGroups = useMemo(() =>
        [ ...groups ].sort((a, b) => (Number(!!b.favourite) - Number(!!a.favourite)) || (a.groupName || '').localeCompare(b.groupName || '')),
    [ groups ]);

    // Gruppo pinnato dall'utente per l'HUD (default = preferito, poi il primo).
    const pinnedGroup = useMemo(() =>
    {
        if(!groups.length) return null;

        if(pinnedGroupId)
        {
            const found = groups.find(group => group.groupId === pinnedGroupId);

            if(found) return found;
        }

        return groups.find(group => !!group.favourite) ?? groups[0];
    }, [ groups, pinnedGroupId ]);

    // Priorità: gruppo della stanza-home corrente > gruppo pinnato.
    const active = roomGroup
        ? { id: roomGroup.id, badge: roomGroup.badge }
        : (pinnedGroup ? { id: pinnedGroup.groupId, badge: pinnedGroup.badgeCode } : null);

    if(!active || !active.badge) return null;

    return (
        <div className="inf-purse__group">
            <div className="inf-purse__group-badge" title="Apri gruppo" onClick={ () => GetGroupInformation(active.id) }>
                <LayoutBadgeImageView badgeCode={ active.badge } isGroup={ true } classNames={ badgeClassNames } style={ badgeStyle } />
            </div>
            { (orderedGroups.length > 0) &&
                <button type="button" className="inf-purse__group-pick" title="Scegli il gruppo da mostrare nell'HUD" onClick={ event => { event.stopPropagation(); setPickerOpen(value => !value); } }>
                    <FaCog />
                </button> }
            { pickerOpen &&
                <div className="inf-purse__group-popover" onClick={ event => event.stopPropagation() }>
                    <div className="inf-purse__group-popover-title">Gruppo nell'HUD</div>
                    <div className="inf-purse__group-popover-list">
                        { orderedGroups.map(group => (
                            <button
                                key={ group.groupId }
                                type="button"
                                className={ `inf-purse__group-item ${ (pinnedGroup && (pinnedGroup.groupId === group.groupId)) ? 'is-active' : '' }` }
                                onClick={ () => { setPinnedGroupId(group.groupId); setPickerOpen(false); } }>
                                <span className="inf-purse__group-item-badge">
                                    <LayoutBadgeImageView badgeCode={ group.badgeCode } isGroup={ true } classNames={ badgeClassNames } style={ badgeStyle } />
                                </span>
                                <span className="inf-purse__group-item-name">{ group.groupName }{ group.favourite ? ' ★' : '' }</span>
                            </button>
                        )) }
                    </div>
                </div> }
        </div>
    );
};
