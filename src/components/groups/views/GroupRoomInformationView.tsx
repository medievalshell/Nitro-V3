import { DesktopViewEvent, GetGuestRoomResultEvent, GetSessionDataManager, GroupInformationComposer, GroupInformationEvent, GroupInformationParser, GroupRemoveMemberComposer, HabboGroupDeactivatedMessageEvent, RoomEntryInfoMessageEvent } from '@nitrots/nitro-renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { GetGroupInformation, GetGroupManager, GroupMembershipType, GroupType, LocalizeText, SendMessageComposer, TryJoinGroup } from '../../../api';
import groupIcon from '../../../assets/images/rightside/group.png';
import { LayoutBadgeImageView } from '../../../common';
import { useMessageEvent, useNotification } from '../../../hooks';

export const GroupRoomInformationView: FC<{}> = props =>
{
    const expectedGroupIdRef = useRef<number>(0);
    const requestRetryCountRef = useRef<number>(0);
    const requestRetryTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const [ groupInformation, setGroupInformation ] = useState<GroupInformationParser>(null);
    const [ isOpen, setIsOpen ] = useState<boolean>(true);
    const [ isCompact, setIsCompact ] = useState(false);
    const { showConfirm = null } = useNotification();

    const clearRequestRetryTimeout = () =>
    {
        if(!requestRetryTimeoutRef.current) return;

        clearTimeout(requestRetryTimeoutRef.current);
        requestRetryTimeoutRef.current = null;
    };

    const scheduleGroupInfoRetry = (groupId: number) =>
    {
        if(requestRetryCountRef.current >= 2) return;

        clearRequestRetryTimeout();

        requestRetryTimeoutRef.current = setTimeout(() =>
        {
            requestRetryTimeoutRef.current = null;

            if(expectedGroupIdRef.current !== groupId) return;
            if(groupInformation && (groupInformation.id === groupId)) return;

            requestRetryCountRef.current++;
            SendMessageComposer(new GroupInformationComposer(groupId, false));
            scheduleGroupInfoRetry(groupId);
        }, 700);
    };

    const requestGroupInformation = (groupId: number) =>
    {
        if(groupId <= 0) return;

        requestRetryCountRef.current = 0;
        clearRequestRetryTimeout();

        SendMessageComposer(new GroupInformationComposer(groupId, false));
        scheduleGroupInfoRetry(groupId);
    };

    const resetGroupState = () =>
    {
        expectedGroupIdRef.current = 0;
        requestRetryCountRef.current = 0;
        clearRequestRetryTimeout();
        setGroupInformation(null);
    };

    const setRequestedGroupId = (groupId: number) =>
    {
        expectedGroupIdRef.current = groupId;
    };

    useMessageEvent<DesktopViewEvent>(DesktopViewEvent, event =>
    {
        resetGroupState();
    });

    useMessageEvent<RoomEntryInfoMessageEvent>(RoomEntryInfoMessageEvent, event =>
    {
        resetGroupState();
    });

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, event =>
    {
        const parser = event.getParser();

        if(!parser.roomEnter) return;

        if(parser.data.habboGroupId > 0)
        {
            setRequestedGroupId(parser.data.habboGroupId);
            requestGroupInformation(parser.data.habboGroupId);
        }
        else
        {
            resetGroupState();
        }
    });

    useMessageEvent<HabboGroupDeactivatedMessageEvent>(HabboGroupDeactivatedMessageEvent, event =>
    {
        const parser = event.getParser();

        if(!groupInformation || ((parser.groupId !== groupInformation.id) && (parser.groupId !== expectedGroupIdRef.current))) return;

        resetGroupState();
    });

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, event =>
    {
        const parser = event.getParser();

        if(parser.id !== expectedGroupIdRef.current) return;

        clearRequestRetryTimeout();
        setGroupInformation(parser);
    });

    useEffect(() => () => clearRequestRetryTimeout(), []);

    useEffect(() =>
    {
        if(isOpen)
        {
            setIsCompact(false);
            return;
        }

        const timeout = window.setTimeout(() => setIsCompact(true), 220);

        return () => window.clearTimeout(timeout);
    }, [ isOpen ]);

    const leaveGroup = () =>
    {
        showConfirm(LocalizeText('group.leaveconfirm.desc'), () =>
        {
            SendMessageComposer(new GroupRemoveMemberComposer(groupInformation.id, GetSessionDataManager().userId));
        }, null);
    };

    const isRealOwner = (groupInformation && (groupInformation.ownerName === GetSessionDataManager().userName));

    const getButtonText = () =>
    {
        if(isRealOwner) return 'group.manage';

        if(groupInformation.type === GroupType.PRIVATE) return '';

        if(groupInformation.membershipType === GroupMembershipType.MEMBER) return 'group.leave';

        if((groupInformation.membershipType === GroupMembershipType.NOT_MEMBER) && groupInformation.type === GroupType.REGULAR) return 'group.join';

        if(groupInformation.membershipType === GroupMembershipType.REQUEST_PENDING) return 'group.membershippending';

        if((groupInformation.membershipType === GroupMembershipType.NOT_MEMBER) && groupInformation.type === GroupType.EXCLUSIVE) return 'group.requestmembership';
    };

    const handleButtonClick = () =>
    {
        if(isRealOwner) return GetGroupManager(groupInformation.id);

        if((groupInformation.type === GroupType.PRIVATE) && (groupInformation.membershipType === GroupMembershipType.NOT_MEMBER)) return;

        if(groupInformation.membershipType === GroupMembershipType.MEMBER)
        {
            leaveGroup();

            return;
        }

        TryJoinGroup(groupInformation.id);
    };

    if(!groupInformation) return null;

    return (
        <div className={ `inf-group-home ${ isCompact ? 'is-compact' : '' }` }>
            <div className="inf-group-home__header" onClick={ event => setIsOpen(value => !value) }>
                <div className="inf-group-home__title-wrap">
                    <span className="inf-group-home__icon"><img src={ groupIcon } alt="" /></span>
                    { !isCompact && <span className="inf-group-home__title">{ LocalizeText('group.homeroominfo.title') }</span> }
                </div>
                <div className={ `inf-group-home__toggle ${ isOpen ? 'is-open' : '' }` }>
                    <FaChevronDown />
                </div>
            </div>
            <div className={ `inf-group-home__content ${ isOpen ? 'is-open' : 'is-closed' }` }>
                <div className="inf-group-home__group" onClick={ event => GetGroupInformation(groupInformation.id) }>
                    <div className="inf-group-home__badge">
                        <LayoutBadgeImageView
                            badgeCode={ groupInformation.badge }
                            isGroup={ true }
                            classNames={ [ 'w-full!', 'h-full!', 'bg-contain!' ] }
                            style={ { width: '100%', height: '100%', backgroundSize: 'contain' } }
                        />
                    </div>
                    <span className="inf-group-home__name">{ groupInformation.title }</span>
                </div>
                { (groupInformation.type !== GroupType.PRIVATE || isRealOwner) &&
                    <div className="inf-group-home__action">
                        <button type="button" className="inf-group-home__btn" disabled={ (groupInformation.membershipType === GroupMembershipType.REQUEST_PENDING) } onClick={ handleButtonClick }>
                            { LocalizeText(getButtonText()) }
                        </button>
                    </div> }
            </div>
        </div>
    );
};
