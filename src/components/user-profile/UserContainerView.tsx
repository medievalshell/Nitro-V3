import { CreateLinkEvent, GetSessionDataManager, RelationshipStatusInfoMessageParser, RequestFriendComposer, UserProfileParser } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { FriendlyTime, LocalizeText, SanitizeHtml, SendMessageComposer } from '../../api';
import { LayoutAvatarImageView, LayoutBadgeImageView, Text, UserIdentityView } from '../../common';
import { badgeEmblemDefault } from '../../assets/images/leaderboard_badge';
import { level as profileLevelIcon, rooms as profileRoomsIcon } from '../../assets/images/user-profile';
import { RelationshipsContainerView } from './RelationshipsContainerView';

interface UserContainerViewProps
{
    userProfile: UserProfileParser;
    userBadges?: string[];
    userRelationships?: RelationshipStatusInfoMessageParser;
    onOpenRooms?: () => void;
}

export const UserContainerView: FC<UserContainerViewProps> = props =>
{
    const { userProfile = null, userBadges = [], userRelationships = null, onOpenRooms = null } = props;

    const [ requestSent, setRequestSent ] = useState(userProfile.requestSent);
    const isOwnProfile = (userProfile.id === GetSessionDataManager().userId);
    const canSendFriendRequest = !requestSent && (!isOwnProfile && !userProfile.isMyFriend && !userProfile.requestSent);
    const infostandBackgroundClass = `background-${ userProfile.backgroundId ?? 'default' }`;
    const infostandStandClass = `stand-${ userProfile.standId ?? 'default' }`;
    const infostandOverlayClass = `overlay-${ userProfile.overlayId ?? 'default' }`;
    const selectedBadges = useMemo(() => [ ...userBadges ].slice(0, 5), [ userBadges ]);
    const totalBadges = ((userProfile as any).totalBadges ?? userBadges.length ?? 0);

    // Adaptive identity text colour: sample the average luminance of the
    // user-chosen profile background image and flag whether it is dark or light,
    // so the overlaid name/motto/meta text can switch white↔black for contrast.
    const avatarShellRef = useRef<HTMLDivElement>(null);
    const [ bgIsDark, setBgIsDark ] = useState<boolean>(true);

    const addFriend = () =>
    {
        setRequestSent(true);
        SendMessageComposer(new RequestFriendComposer(userProfile.username));
    };

    useEffect(() =>
    {
        setRequestSent(userProfile.requestSent);
    }, [ userProfile ]);

    useEffect(() =>
    {
        // Sample the luminance of whatever sits BEHIND the identity text: the
        // profile card background image when the user set one, otherwise the
        // window content's solid background colour (cream by default).
        const shell = avatarShellRef.current;
        const target = (shell?.closest('.nitro-extended-profile-window__content') as HTMLElement | null) ?? shell;
        if(!target) return;

        const isDarkFromRgb = (rgb: string): boolean | null =>
        {
            const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(rgb || '');
            if(!m) return null;
            const lum = (0.2126 * +m[1]) + (0.7152 * +m[2]) + (0.0722 * +m[3]);
            return lum < 130;
        };

        const style = window.getComputedStyle(target);
        const match = /url\(["']?([^"')]+)["']?\)/.exec(style.backgroundImage || '');

        if(!match || !match[1])
        {
            // No card image -> decide from the solid background colour (default cream = light).
            const fromColor = isDarkFromRgb(style.backgroundColor);
            setBgIsDark(fromColor ?? false);
            return;
        }

        let cancelled = false;
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () =>
        {
            if(cancelled) return;
            try
            {
                const canvas = document.createElement('canvas');
                canvas.width = 16;
                canvas.height = 16;
                const ctx = canvas.getContext('2d');
                if(!ctx) return;
                ctx.drawImage(image, 0, 0, 16, 16);
                const data = ctx.getImageData(0, 0, 16, 16).data;
                let luminance = 0;
                let count = 0;
                for(let i = 0; i < data.length; i += 4)
                {
                    if(data[i + 3] < 8) continue;
                    luminance += (0.2126 * data[i]) + (0.7152 * data[i + 1]) + (0.0722 * data[i + 2]);
                    count++;
                }
                if(count > 0) setBgIsDark((luminance / count) < 130);
            }
            catch
            {}
        };
        image.onerror = () => { if(!cancelled) setBgIsDark(isDarkFromRgb(style.backgroundColor) ?? false); };
        image.src = match[1];

        return () => { cancelled = true; };
    }, [ userProfile.backgroundId ]);

    const bgToneClass = bgIsDark ? 'profile-bg-dark' : 'profile-bg-light';

    return (
        <div className="nitro-extended-profile">
            <div className="nitro-extended-profile__top">
                <div className="nitro-extended-profile__left">
                    <div className={ `nitro-extended-profile__identity ${ bgToneClass }` }>
                        <div ref={ avatarShellRef } className={ `nitro-extended-profile__avatar-shell profile-background ${ infostandBackgroundClass }` }>
                            <div className={ `nitro-extended-profile__avatar-stand profile-stand ${ infostandStandClass }` } />
                            <LayoutAvatarImageView figure={ userProfile.figure } direction={ 2 } classNames={ [ 'nitro-extended-profile__avatar-image' ] } />
                            <div className={ `nitro-extended-profile__avatar-overlay profile-overlay ${ infostandOverlayClass }` } />
                        </div>
                        <div className="nitro-extended-profile__identity-copy">
                            <UserIdentityView
                                className="nitro-extended-profile__username"
                                displayOrder={ userProfile.displayOrder }
                                nickIcon={ userProfile.nickIcon }
                                prefixColor={ userProfile.prefixColor }
                                prefixEffect={ userProfile.prefixEffect }
                                prefixFont={ userProfile.prefixFont }
                                prefixIcon={ userProfile.prefixIcon }
                                prefixText={ userProfile.prefixText }
                                username={ userProfile.username } />
                            <p className="nitro-extended-profile__motto">{ userProfile.motto || '\u00A0' }</p>
                            <p className="nitro-extended-profile__meta">
                                <span dangerouslySetInnerHTML={ { __html: SanitizeHtml(LocalizeText('extendedprofile.created').replace(/%\w+%/g, '').trim()) } } /> { userProfile.registration }
                            </p>
                            <p className="nitro-extended-profile__meta">
                                <span dangerouslySetInnerHTML={ { __html: SanitizeHtml(LocalizeText('extendedprofile.last.login').replace(/%\w+%/g, '').trim()) } } /> { FriendlyTime.format(userProfile.secondsSinceLastVisit, '.ago', 2) }
                            </p>
                            <p className="nitro-extended-profile__meta nitro-extended-profile__meta--strong">
                                <b>{ LocalizeText('extendedprofile.achievementscore') }</b> { userProfile.achievementPoints }
                            </p>
                            <div className="nitro-extended-profile__status">
                                <div className="nitro-extended-profile__presence">
                                    <i className={ `nitro-icon ${ userProfile.isOnline ? 'icon-pf-online' : 'icon-pf-offline' }` } />
                                </div>
                                <div className="nitro-extended-profile__status-copy">
                                    { canSendFriendRequest &&
                                        <button className="nitro-extended-profile__friend-button" type="button" onClick={ addFriend }>
                                            { LocalizeText('extendedprofile.addasafriend') }
                                        </button> }
                                    { !canSendFriendRequest &&
                                        <>
                                            <i className="nitro-icon icon-pf-tick" />
                                            <span className="nitro-extended-profile__status-text">
                                                { isOwnProfile && LocalizeText('extendedprofile.me') }
                                                { userProfile.isMyFriend && LocalizeText('extendedprofile.friend') }
                                                { (requestSent || userProfile.requestSent) && LocalizeText('extendedprofile.friendrequestsent') }
                                            </span>
                                        </> }
                                </div>
                            </div>
                        </div>
                    </div>

                    { isOwnProfile &&
                        <div className="nitro-extended-profile__actions">
                            <button className="nitro-extended-profile__link" type="button" onClick={ () => CreateLinkEvent('avatar-editor/show') }>
                                { LocalizeText('extended.profile.change.looks') }
                            </button>
                            <button className="nitro-extended-profile__link" type="button" onClick={ () => CreateLinkEvent('inventory/show/badges') }>
                                { LocalizeText('extended.profile.change.badges') }
                            </button>
                        </div> }

                    <div className="nitro-extended-profile__badges">
                        { [ 0, 1, 2, 3, 4 ].map(index => (
                            <button key={ index } className="nitro-extended-profile__badge-slot" type="button">
                                { selectedBadges[index] && <LayoutBadgeImageView badgeCode={ selectedBadges[index] } highlightRarity showInfo showRarityInfo /> }
                            </button>
                        )) }
                    </div>
                </div>

                <div className="nitro-extended-profile__separator" />

                <div className="nitro-extended-profile__right">
                    <p
                        className="text-sm leading-none"
                        dangerouslySetInnerHTML={{
                            __html: SanitizeHtml(LocalizeText(
                                'extendedprofile.friends.count',
                                ['count'],
                                [userProfile.friendsCount.toString()]
                            ))
                        }}
                    />
                    <p className="nitro-extended-profile__relationships-label">{ LocalizeText('extendedprofile.relstatus') }</p>
                    { userRelationships &&
                        <RelationshipsContainerView relationships={ userRelationships } /> }
                    { !userRelationships &&
                        <Text small variant="muted">{ LocalizeText('generic.loading') }</Text> }
                </div>
            </div>

            <div className="nitro-extended-profile__summary-bar">
                <button className="nitro-extended-profile__summary-button" type="button" onClick={ onOpenRooms }>
                    <img className="nitro-extended-profile__summary-icon" src={ profileRoomsIcon } alt="" />
                    <span className="nitro-extended-profile__summary-label">{ LocalizeText('extendedprofile.rooms') }</span>
                </button>
                <button className="nitro-extended-profile__summary-button nitro-extended-profile__summary-button--center" type="button" onClick={ () => CreateLinkEvent('badge-leaderboard/show') }>
                    <img className="nitro-extended-profile__summary-icon nitro-extended-profile__summary-icon--badge" src={ badgeEmblemDefault } alt="" />
                    <span className="nitro-extended-profile__summary-label">{ LocalizeText('inventory.badges') }</span>
                    <span className="nitro-extended-profile__summary-value">{ totalBadges }</span>
                </button>
                <button className="nitro-extended-profile__summary-button nitro-extended-profile__summary-button--center" type="button" onClick={ () => CreateLinkEvent('achievements/toggle') }>
                    <img className="nitro-extended-profile__summary-icon" src={ profileLevelIcon } alt="" />
                    <span className="nitro-extended-profile__summary-label">{ LocalizeText('extendedprofile.achievementscore') }</span>
                    <span className="nitro-extended-profile__summary-value">{ userProfile.achievementPoints }</span>
                </button>
            </div>
        </div>
    );
};
