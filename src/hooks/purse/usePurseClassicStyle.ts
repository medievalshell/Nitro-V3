import { useBetween } from 'use-between';
import { GetConfigurationValue, LocalStorageKeys } from '../../api';
import { useLocalStorage } from '../useLocalStorage';

// Per-user toggle for the "classic" (fully CSS-customizable) purse layout.
//  - true  => Infinity classic purse: a clean, blank-canvas DOM (`inf-purse-*`
//             classes + CSS custom properties) meant to be styled/positioned
//             entirely from the theme CSS, down to the smallest detail.
//  - false => default custom purse (the existing PurseView markup).
// The default for users who never touched the toggle comes from the global
// `purse.classic.style` flag in ui-config.json, so an admin can flip the
// default for everyone while still letting each user override it from Settings.
const usePurseClassicStyleState = () => useLocalStorage<boolean>(LocalStorageKeys.PURSE_CLASSIC_STYLE, GetConfigurationValue<boolean>('purse.classic.style', false));

export const usePurseClassicStyle = () => useBetween(usePurseClassicStyleState);
