import {
    IWiredVariableFxConfig,
    IWiredVariableFxStatus,
    IWiredVariableFxStatusKey,
    WiredVariableFxConfigsEvent,
    WiredVariableFxConfigsRemovedEvent,
    WiredVariableFxStatusEvent,
    WiredVariableFxStatusRemovedEvent,
    wiredVariableFxStatusKey
} from '@octane/renderer';
import { useCallback } from 'react';
import { create } from 'zustand';
import { useMessageEvent } from '../events';

export interface IWiredVariableFxStatusEntry
{
    key: string;
    status: IWiredVariableFxStatus;
    previousValue: number | null;
    changedAt: number;
}

interface IWiredVariableFxStore
{
    configs: Record<number, IWiredVariableFxConfig>;
    statuses: Record<string, IWiredVariableFxStatusEntry>;
    setConfigs: (configs: IWiredVariableFxConfig[]) => void;
    removeConfigs: (configIds: number[]) => void;
    setStatuses: (statuses: IWiredVariableFxStatus[]) => void;
    removeStatuses: (keys: IWiredVariableFxStatusKey[]) => void;
}

export const useWiredVariableFxStore = create<IWiredVariableFxStore>((set) => ({
    configs: {},
    statuses: {},
    setConfigs: (configs) =>
        set((state) => {
            const nextConfigs = { ...state.configs };

            for(const config of configs) nextConfigs[config.configId] = config;

            return { configs: nextConfigs };
        }),
    removeConfigs: (configIds) =>
        set((state) => {
            const removed = new Set(configIds);
            const nextConfigs = { ...state.configs };
            const nextStatuses = { ...state.statuses };

            for(const configId of configIds) delete nextConfigs[configId];

            for(const [key, entry] of Object.entries(nextStatuses))
            {
                if(removed.has(entry.status.configId)) delete nextStatuses[key];
            }

            return { configs: nextConfigs, statuses: nextStatuses };
        }),
    setStatuses: (statuses) =>
        set((state) => {
            const nextStatuses = { ...state.statuses };
            const now = Date.now();

            for(const status of statuses)
            {
                const key = wiredVariableFxStatusKey(status);
                const previous = nextStatuses[key];
                const valueChanged = !previous || previous.status.value !== status.value || status.initialize;

                nextStatuses[key] = {
                    key,
                    status,
                    previousValue: previous ? previous.status.value : null,
                    changedAt: valueChanged ? now : previous.changedAt
                };
            }

            return { statuses: nextStatuses };
        }),
    removeStatuses: (keys) =>
        set((state) => {
            const nextStatuses = { ...state.statuses };

            for(const key of keys) delete nextStatuses[wiredVariableFxStatusKey(key)];

            return { statuses: nextStatuses };
        })
}));

export const useWiredVariableFxEvents = () => {
    const setConfigs = useWiredVariableFxStore((state) => state.setConfigs);
    const removeConfigs = useWiredVariableFxStore((state) => state.removeConfigs);
    const setStatuses = useWiredVariableFxStore((state) => state.setStatuses);
    const removeStatuses = useWiredVariableFxStore((state) => state.removeStatuses);

    useMessageEvent<WiredVariableFxConfigsEvent>(
        WiredVariableFxConfigsEvent,
        useCallback((event) => setConfigs(event.getParser().configs), [setConfigs])
    );

    useMessageEvent<WiredVariableFxConfigsRemovedEvent>(
        WiredVariableFxConfigsRemovedEvent,
        useCallback((event) => removeConfigs(event.getParser().configIds), [removeConfigs])
    );

    useMessageEvent<WiredVariableFxStatusEvent>(
        WiredVariableFxStatusEvent,
        useCallback((event) => setStatuses(event.getParser().statuses), [setStatuses])
    );

    useMessageEvent<WiredVariableFxStatusRemovedEvent>(
        WiredVariableFxStatusRemovedEvent,
        useCallback((event) => removeStatuses(event.getParser().keys), [removeStatuses])
    );
};
