<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems
// Copyright (c) 2025 Cassian Gherman (NaysKutzu)
// Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Command, ListChecks, Map, MessageSquare, Save, Settings2, Users } from 'lucide-vue-next';

type Primitive = string | number | boolean | null;

interface SpigotYaml {
    settings?: Record<string, unknown>;
    messages?: Record<string, Primitive>;
    advancements?: Record<string, unknown>;
    'world-settings'?: Record<string, unknown>;
    players?: Record<string, unknown>;
    stats?: Record<string, unknown>;
    commands?: Record<string, unknown>;
    [key: string]: unknown;
}

type GrowthKey =
    | 'cactus-modifier'
    | 'cane-modifier'
    | 'melon-modifier'
    | 'mushroom-modifier'
    | 'pumpkin-modifier'
    | 'sapling-modifier'
    | 'beetroot-modifier'
    | 'carrot-modifier'
    | 'potato-modifier'
    | 'torchflower-modifier'
    | 'wheat-modifier'
    | 'netherwart-modifier'
    | 'vine-modifier'
    | 'cocoa-modifier'
    | 'bamboo-modifier'
    | 'sweetberry-modifier'
    | 'kelp-modifier'
    | 'twistingvines-modifier'
    | 'weepingvines-modifier'
    | 'cavevines-modifier'
    | 'glowberry-modifier'
    | 'pitcherplant-modifier';

type HungerKey =
    | 'jump-walk-exhaustion'
    | 'jump-sprint-exhaustion'
    | 'combat-exhaustion'
    | 'regen-exhaustion'
    | 'swim-multiplier'
    | 'sprint-multiplier'
    | 'other-multiplier';

type SeedKey =
    | 'seed-village'
    | 'seed-desert'
    | 'seed-igloo'
    | 'seed-jungle'
    | 'seed-swamp'
    | 'seed-monument'
    | 'seed-shipwreck'
    | 'seed-ocean'
    | 'seed-outpost'
    | 'seed-endcity'
    | 'seed-slime'
    | 'seed-nether'
    | 'seed-mansion'
    | 'seed-fossil'
    | 'seed-portal'
    | 'seed-ancientcity'
    | 'seed-trailruins'
    | 'seed-trialchambers'
    | 'seed-buriedtreasure'
    | 'seed-mineshaft'
    | 'seed-stronghold';

const growthKeys: GrowthKey[] = [
    'cactus-modifier',
    'cane-modifier',
    'melon-modifier',
    'mushroom-modifier',
    'pumpkin-modifier',
    'sapling-modifier',
    'beetroot-modifier',
    'carrot-modifier',
    'potato-modifier',
    'torchflower-modifier',
    'wheat-modifier',
    'netherwart-modifier',
    'vine-modifier',
    'cocoa-modifier',
    'bamboo-modifier',
    'sweetberry-modifier',
    'kelp-modifier',
    'twistingvines-modifier',
    'weepingvines-modifier',
    'cavevines-modifier',
    'glowberry-modifier',
    'pitcherplant-modifier',
];

const wakeUpKeys = [
    'animals-max-per-tick',
    'animals-every',
    'animals-for',
    'monsters-max-per-tick',
    'monsters-every',
    'monsters-for',
    'villagers-max-per-tick',
    'villagers-every',
    'villagers-for',
    'flying-monsters-max-per-tick',
    'flying-monsters-every',
    'flying-monsters-for',
] as const;

const wakeUpDefaults: Record<(typeof wakeUpKeys)[number], number> = {
    'animals-max-per-tick': 4,
    'animals-every': 1200,
    'animals-for': 100,
    'monsters-max-per-tick': 8,
    'monsters-every': 400,
    'monsters-for': 100,
    'villagers-max-per-tick': 4,
    'villagers-every': 600,
    'villagers-for': 100,
    'flying-monsters-max-per-tick': 8,
    'flying-monsters-every': 200,
    'flying-monsters-for': 100,
};

const hungerKeys: HungerKey[] = [
    'jump-walk-exhaustion',
    'jump-sprint-exhaustion',
    'combat-exhaustion',
    'regen-exhaustion',
    'swim-multiplier',
    'sprint-multiplier',
    'other-multiplier',
];

const hungerDefaults: Record<HungerKey, number> = {
    'jump-walk-exhaustion': 0.05,
    'jump-sprint-exhaustion': 0.2,
    'combat-exhaustion': 0.1,
    'regen-exhaustion': 6,
    'swim-multiplier': 0.01,
    'sprint-multiplier': 0.1,
    'other-multiplier': 0,
};

const seedKeys: SeedKey[] = [
    'seed-village',
    'seed-desert',
    'seed-igloo',
    'seed-jungle',
    'seed-swamp',
    'seed-monument',
    'seed-shipwreck',
    'seed-ocean',
    'seed-outpost',
    'seed-endcity',
    'seed-slime',
    'seed-nether',
    'seed-mansion',
    'seed-fossil',
    'seed-portal',
    'seed-ancientcity',
    'seed-trailruins',
    'seed-trialchambers',
    'seed-buriedtreasure',
    'seed-mineshaft',
    'seed-stronghold',
];

const defaultSeedDefaults: Record<SeedKey, string> = {
    'seed-village': '10387312',
    'seed-desert': '14357617',
    'seed-igloo': '14357618',
    'seed-jungle': '14357619',
    'seed-swamp': '14357620',
    'seed-monument': '10387313',
    'seed-shipwreck': '165745295',
    'seed-ocean': '14357621',
    'seed-outpost': '165745296',
    'seed-endcity': '10387313',
    'seed-slime': '987234911',
    'seed-nether': '30084232',
    'seed-mansion': '10387319',
    'seed-fossil': '14357921',
    'seed-portal': '34222645',
    'seed-ancientcity': '20083232',
    'seed-trailruins': '83469867',
    'seed-trialchambers': '94251327',
    'seed-buriedtreasure': '10387320',
    'seed-mineshaft': 'default',
    'seed-stronghold': 'default',
};

const mergeRadiusKeys = ['item', 'exp'] as const;

interface SpigotConfigurationForm {
    settings: {
        bungeecord: boolean;
        saveUserCacheOnStopOnly: boolean;
        sampleCount: number;
        playerShuffle: number;
        userCacheSize: number;
        movedWronglyThreshold: number;
        movedTooQuicklyMultiplier: number;
        timeoutTime: number;
        restartOnCrash: boolean;
        restartScript: string;
        nettyThreads: number;
        logVillagerDeaths: boolean;
        logNamedDeaths: boolean;
        debug: boolean;
        attribute: {
            maxAbsorption: number;
            maxHealth: number;
            movementSpeed: number;
            attackDamage: number;
        };
    };
    messages: {
        whitelist: string;
        unknownCommand: string;
        serverFull: string;
        outdatedClient: string;
        outdatedServer: string;
        restart: string;
    };
    advancements: {
        disableSaving: boolean;
        disabledList: string;
    };
    world: {
        belowZeroGenerationInExistingChunks: boolean;
        viewDistance: string;
        simulationDistance: string;
        mobSpawnRange: number;
        itemDespawnRate: number;
        thunderChance: number;
        arrowDespawnRate: number;
        tridentDespawnRate: number;
        zombieAggressiveTowardsVillager: boolean;
        nerfSpawnerMobs: boolean;
        enableZombiePigmenPortalSpawns: boolean;
        witherSpawnSoundRadius: number;
        endPortalSoundRadius: number;
        hangingTickFrequency: number;
        unloadFrozenChunks: boolean;
        mergeRadius: Record<'item' | 'exp', number>;
        growth: Record<GrowthKey, number>;
        entityActivationRange: {
            animals: number;
            monsters: number;
            raiders: number;
            misc: number;
            water: number;
            villagers: number;
            flyingMonsters: number;
            wakeUpInactive: {
                'animals-max-per-tick': number;
                'animals-every': number;
                'animals-for': number;
                'monsters-max-per-tick': number;
                'monsters-every': number;
                'monsters-for': number;
                'villagers-max-per-tick': number;
                'villagers-every': number;
                'villagers-for': number;
                'flying-monsters-max-per-tick': number;
                'flying-monsters-every': number;
                'flying-monsters-for': number;
            };
            'villagers-work-immunity-after': number;
            'villagers-work-immunity-for': number;
            'villagers-active-for-panic': boolean;
            'tick-inactive-villagers': boolean;
            'ignore-spectators': boolean;
        };
        entityTrackingRange: {
            players: number;
            animals: number;
            monsters: number;
            misc: number;
            display: number;
            other: number;
        };
        ticksPer: {
            'hopper-transfer': number;
            'hopper-check': number;
        };
        hopperAmount: number;
        hopperCanLoadChunks: boolean;
        dragonDeathSoundRadius: number;
        seeds: Record<SeedKey, string>;
        hunger: Record<HungerKey, number>;
        maxTntPerTick: number;
        maxTickTime: {
            tile: number;
            entity: number;
        };
        verbose: boolean;
    };
    playersDisableSaving: boolean;
    configVersion: number;
    statsDisableSaving: boolean;
    forcedStatsText: string;
    commands: {
        log: boolean;
        tabComplete: number;
        sendNamespaced: boolean;
        spamExclusionsText: string;
        silentCommandblockConsole: boolean;
        replaceCommandsText: string;
        enableSpamExclusions: boolean;
    };
}

interface ParseResult {
    data: SpigotYaml;
}

const props = withDefaults(
    defineProps<{
        content: string;
        readonly?: boolean;
        saving?: boolean;
    }>(),
    {
        readonly: false,
        saving: false,
    },
);

const emit = defineEmits<{
    save: [content: string];
    switchToRaw: [];
}>();

const { t } = useI18n();

const originalConfig = reactive<ParseResult>({ data: parseSpigotConfiguration(props.content) });
const form = reactive<SpigotConfigurationForm>(createForm(originalConfig.data));

watch(
    () => props.content,
    (newContent) => {
        originalConfig.data = parseSpigotConfiguration(newContent);
        resetForm(form, originalConfig.data);
    },
);

function parseSpigotConfiguration(content: string): SpigotYaml {
    try {
        const parsed = parseYaml(content) as SpigotYaml;
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    } catch (error) {
        console.warn('Failed to parse spigot.yml:', error);
    }
    return {};
}

function createForm(config: SpigotYaml): SpigotConfigurationForm {
    const settings = (config.settings ?? {}) as Record<string, unknown>;
    const attribute = (settings.attribute ?? {}) as Record<string, unknown>;
    const messages = (config.messages ?? {}) as Record<string, Primitive>;
    const advancements = (config.advancements ?? {}) as Record<string, unknown>;
    const worldSettings = ((config['world-settings'] ?? {}) as Record<string, unknown>).default as
        | Record<string, unknown>
        | undefined;
    const defaultWorld = (worldSettings ?? {}) as Record<string, unknown>;
    const mergeRadius = (defaultWorld['merge-radius'] ?? {}) as Record<string, unknown>;
    const growth = (defaultWorld.growth ?? {}) as Record<string, unknown>;
    const entityActivationRange = (defaultWorld['entity-activation-range'] ?? {}) as Record<string, unknown>;
    const wakeUpInactive = (entityActivationRange['wake-up-inactive'] ?? {}) as Record<string, unknown>;
    const entityTrackingRange = (defaultWorld['entity-tracking-range'] ?? {}) as Record<string, unknown>;
    const ticksPer = (defaultWorld['ticks-per'] ?? {}) as Record<string, unknown>;
    const hunger = (defaultWorld.hunger ?? {}) as Record<string, unknown>;
    const maxTickTime = (defaultWorld['max-tick-time'] ?? {}) as Record<string, unknown>;
    const players = (config.players ?? {}) as Record<string, unknown>;
    const stats = (config.stats ?? {}) as Record<string, unknown>;
    const commands = (config.commands ?? {}) as Record<string, unknown>;

    return {
        settings: {
            bungeecord: toBoolean(settings.bungeecord, false),
            saveUserCacheOnStopOnly: toBoolean(settings['save-user-cache-on-stop-only'], false),
            sampleCount: toNumber(settings['sample-count'], 12),
            playerShuffle: toNumber(settings['player-shuffle'], 0),
            userCacheSize: toNumber(settings['user-cache-size'], 1000),
            movedWronglyThreshold: toNumber(settings['moved-wrongly-threshold'], 0.0625),
            movedTooQuicklyMultiplier: toNumber(settings['moved-too-quickly-multiplier'], 10),
            timeoutTime: toNumber(settings['timeout-time'], 60),
            restartOnCrash: toBoolean(settings['restart-on-crash'], true),
            restartScript: toString(settings['restart-script'], './start.sh'),
            nettyThreads: toNumber(settings['netty-threads'], 4),
            logVillagerDeaths: toBoolean(settings['log-villager-deaths'], true),
            logNamedDeaths: toBoolean(settings['log-named-deaths'], true),
            debug: toBoolean(settings.debug, false),
            attribute: {
                maxAbsorption: toNumber((attribute.maxAbsorption as Record<string, unknown>)?.max, 2048),
                maxHealth: toNumber((attribute.maxHealth as Record<string, unknown>)?.max, 1024),
                movementSpeed: toNumber((attribute.movementSpeed as Record<string, unknown>)?.max, 1024),
                attackDamage: toNumber((attribute.attackDamage as Record<string, unknown>)?.max, 2048),
            },
        },
        messages: {
            whitelist: toString(messages.whitelist, 'You are not whitelisted on this server!'),
            unknownCommand: toString(messages['unknown-command'], 'Unknown command. Type "/help" for help.'),
            serverFull: toString(messages['server-full'], 'The server is full!'),
            outdatedClient: toString(messages['outdated-client'], 'Outdated client! Please use {0}'),
            outdatedServer: toString(messages['outdated-server'], "Outdated server! I'm still on {0}"),
            restart: toString(messages.restart, 'Server is restarting'),
        },
        advancements: {
            disableSaving: toBoolean(advancements['disable-saving'], false),
            disabledList: Array.isArray(advancements.disabled) ? (advancements.disabled as string[]).join('\n') : '',
        },
        world: {
            belowZeroGenerationInExistingChunks: toBoolean(
                defaultWorld['below-zero-generation-in-existing-chunks'],
                true,
            ),
            viewDistance: toTypedString(defaultWorld['view-distance'], 'default'),
            simulationDistance: toTypedString(defaultWorld['simulation-distance'], 'default'),
            mobSpawnRange: toNumber(defaultWorld['mob-spawn-range'], 8),
            itemDespawnRate: toNumber(defaultWorld['item-despawn-rate'], 6000),
            thunderChance: toNumber(defaultWorld['thunder-chance'], 100000),
            arrowDespawnRate: toNumber(defaultWorld['arrow-despawn-rate'], 1200),
            tridentDespawnRate: toNumber(defaultWorld['trident-despawn-rate'], 1200),
            zombieAggressiveTowardsVillager: toBoolean(defaultWorld['zombie-aggressive-towards-villager'], true),
            nerfSpawnerMobs: toBoolean(defaultWorld['nerf-spawner-mobs'], false),
            enableZombiePigmenPortalSpawns: toBoolean(defaultWorld['enable-zombie-pigmen-portal-spawns'], true),
            witherSpawnSoundRadius: toNumber(defaultWorld['wither-spawn-sound-radius'], 0),
            endPortalSoundRadius: toNumber(defaultWorld['end-portal-sound-radius'], 0),
            hangingTickFrequency: toNumber(defaultWorld['hanging-tick-frequency'], 100),
            unloadFrozenChunks: toBoolean(defaultWorld['unload-frozen-chunks'], false),
            mergeRadius: {
                item: toNumber(mergeRadius.item, 0.5),
                exp: toNumber(mergeRadius.exp, -1),
            },
            growth: Object.fromEntries(growthKeys.map((key) => [key, toNumber(growth[key], 100)])) as Record<
                GrowthKey,
                number
            >,
            entityActivationRange: {
                animals: toNumber(entityActivationRange.animals, 32),
                monsters: toNumber(entityActivationRange.monsters, 32),
                raiders: toNumber(entityActivationRange.raiders, 64),
                misc: toNumber(entityActivationRange.misc, 16),
                water: toNumber(entityActivationRange.water, 16),
                villagers: toNumber(entityActivationRange.villagers, 32),
                flyingMonsters: toNumber(entityActivationRange['flying-monsters'], 32),
                wakeUpInactive: Object.fromEntries(
                    wakeUpKeys.map((key) => [key, toNumber(wakeUpInactive[key], wakeUpDefaults[key])]),
                ) as SpigotConfigurationForm['world']['entityActivationRange']['wakeUpInactive'],
                'villagers-work-immunity-after': toNumber(entityActivationRange['villagers-work-immunity-after'], 100),
                'villagers-work-immunity-for': toNumber(entityActivationRange['villagers-work-immunity-for'], 20),
                'villagers-active-for-panic': toBoolean(entityActivationRange['villagers-active-for-panic'], true),
                'tick-inactive-villagers': toBoolean(entityActivationRange['tick-inactive-villagers'], true),
                'ignore-spectators': toBoolean(entityActivationRange['ignore-spectators'], false),
            },
            entityTrackingRange: {
                players: toNumber(entityTrackingRange.players, 128),
                animals: toNumber(entityTrackingRange.animals, 96),
                monsters: toNumber(entityTrackingRange.monsters, 96),
                misc: toNumber(entityTrackingRange.misc, 96),
                display: toNumber(entityTrackingRange.display, 128),
                other: toNumber(entityTrackingRange.other, 64),
            },
            ticksPer: {
                'hopper-transfer': toNumber(ticksPer['hopper-transfer'], 8),
                'hopper-check': toNumber(ticksPer['hopper-check'], 1),
            },
            hopperAmount: toNumber(defaultWorld['hopper-amount'], 1),
            hopperCanLoadChunks: toBoolean(defaultWorld['hopper-can-load-chunks'], false),
            dragonDeathSoundRadius: toNumber(defaultWorld['dragon-death-sound-radius'], 0),
            seeds: Object.fromEntries(
                seedKeys.map((key) => [key, toTypedString(defaultWorld[key], defaultSeedDefaults[key])]),
            ) as Record<SeedKey, string>,
            hunger: Object.fromEntries(
                hungerKeys.map((key) => [key, toNumber(hunger[key], hungerDefaults[key])]),
            ) as Record<HungerKey, number>,
            maxTntPerTick: toNumber(defaultWorld['max-tnt-per-tick'], 100),
            maxTickTime: {
                tile: toNumber(maxTickTime.tile, 50),
                entity: toNumber(maxTickTime.entity, 50),
            },
            verbose: toBoolean(defaultWorld.verbose, false),
        },
        playersDisableSaving: toBoolean(players['disable-saving'], false),
        configVersion: toNumber(config['config-version'], 12),
        statsDisableSaving: toBoolean(stats['disable-saving'], false),
        forcedStatsText:
            typeof stats['forced-stats'] === 'object' && stats['forced-stats'] !== null
                ? JSON.stringify(stats['forced-stats'], null, 2)
                : '',
        commands: {
            log: toBoolean(commands.log, true),
            tabComplete: toNumber(commands['tab-complete'], 0),
            sendNamespaced: toBoolean(commands['send-namespaced'], true),
            spamExclusionsText: Array.isArray(commands['spam-exclusions'])
                ? (commands['spam-exclusions'] as string[]).join('\n')
                : '',
            silentCommandblockConsole: toBoolean(commands['silent-commandblock-console'], false),
            replaceCommandsText: Array.isArray(commands['replace-commands'])
                ? (commands['replace-commands'] as string[]).join('\n')
                : '',
            enableSpamExclusions: toBoolean(commands['enable-spam-exclusions'], false),
        },
    };
}

function resetForm(target: SpigotConfigurationForm, config: SpigotYaml): void {
    const fresh = createForm(config);
    Object.assign(target.settings, fresh.settings);
    Object.assign(target.settings.attribute, fresh.settings.attribute);
    Object.assign(target.messages, fresh.messages);
    Object.assign(target.advancements, fresh.advancements);
    Object.assign(target.world, fresh.world);
    Object.assign(target.world.mergeRadius, fresh.world.mergeRadius);
    Object.assign(target.world.growth, fresh.world.growth);
    Object.assign(target.world.entityActivationRange, fresh.world.entityActivationRange);
    Object.assign(target.world.entityActivationRange.wakeUpInactive, fresh.world.entityActivationRange.wakeUpInactive);
    Object.assign(target.world.entityTrackingRange, fresh.world.entityTrackingRange);
    Object.assign(target.world.ticksPer, fresh.world.ticksPer);
    Object.assign(target.world.seeds, fresh.world.seeds);
    Object.assign(target.world.hunger, fresh.world.hunger);
    Object.assign(target.world.maxTickTime, fresh.world.maxTickTime);
    target.playersDisableSaving = fresh.playersDisableSaving;
    target.configVersion = fresh.configVersion;
    target.statsDisableSaving = fresh.statsDisableSaving;
    target.forcedStatsText = fresh.forcedStatsText;
    Object.assign(target.commands, fresh.commands);
}

function toBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
    }
    return fallback;
}

function toNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    const numeric = Number.parseFloat(String(value));
    if (!Number.isNaN(numeric)) {
        return numeric;
    }
    return fallback;
}

function toString(value: unknown, fallback: string): string {
    if (value === undefined || value === null) {
        return fallback;
    }
    return String(value);
}

function toTypedString(value: unknown, fallback: string): string {
    if (value === undefined || value === null) {
        return fallback;
    }
    return typeof value === 'string' ? value : String(value);
}

function applyFormToConfig(config: SpigotYaml, formState: SpigotConfigurationForm): void {
    const result = parseYaml(stringifyYaml(config)) as SpigotYaml;

    result.settings = result.settings ?? {};
    const settings = result.settings as Record<string, unknown>;
    settings.bungeecord = formState.settings.bungeecord;
    settings['save-user-cache-on-stop-only'] = formState.settings.saveUserCacheOnStopOnly;
    settings['sample-count'] = formState.settings.sampleCount;
    settings['player-shuffle'] = formState.settings.playerShuffle;
    settings['user-cache-size'] = formState.settings.userCacheSize;
    settings['moved-wrongly-threshold'] = formState.settings.movedWronglyThreshold;
    settings['moved-too-quickly-multiplier'] = formState.settings.movedTooQuicklyMultiplier;
    settings['timeout-time'] = formState.settings.timeoutTime;
    settings['restart-on-crash'] = formState.settings.restartOnCrash;
    settings['restart-script'] = formState.settings.restartScript;
    settings['netty-threads'] = formState.settings.nettyThreads;
    settings['log-villager-deaths'] = formState.settings.logVillagerDeaths;
    settings['log-named-deaths'] = formState.settings.logNamedDeaths;
    settings.debug = formState.settings.debug;
    settings.attribute = settings.attribute ?? {};
    const attribute = settings.attribute as Record<string, unknown>;
    attribute.maxAbsorption = { max: formState.settings.attribute.maxAbsorption };
    attribute.maxHealth = { max: formState.settings.attribute.maxHealth };
    attribute.movementSpeed = { max: formState.settings.attribute.movementSpeed };
    attribute.attackDamage = { max: formState.settings.attribute.attackDamage };

    result.messages = result.messages ?? {};
    const messages = result.messages as Record<string, Primitive>;
    messages.whitelist = formState.messages.whitelist;
    messages['unknown-command'] = formState.messages.unknownCommand;
    messages['server-full'] = formState.messages.serverFull;
    messages['outdated-client'] = formState.messages.outdatedClient;
    messages['outdated-server'] = formState.messages.outdatedServer;
    messages.restart = formState.messages.restart;

    result.advancements = result.advancements ?? {};
    const advancements = result.advancements as Record<string, unknown>;
    advancements['disable-saving'] = formState.advancements.disableSaving;
    advancements.disabled = formState.advancements.disabledList
        .split('\n')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    result['world-settings'] = result['world-settings'] ?? {};
    const worldSettings = result['world-settings'] as Record<string, unknown>;
    worldSettings.default = worldSettings.default ?? {};
    const defaultWorld = worldSettings.default as Record<string, unknown>;
    defaultWorld['below-zero-generation-in-existing-chunks'] = formState.world.belowZeroGenerationInExistingChunks;
    defaultWorld['view-distance'] = formState.world.viewDistance;
    defaultWorld['simulation-distance'] = formState.world.simulationDistance;
    defaultWorld['mob-spawn-range'] = formState.world.mobSpawnRange;
    defaultWorld['item-despawn-rate'] = formState.world.itemDespawnRate;
    defaultWorld['thunder-chance'] = formState.world.thunderChance;
    defaultWorld['arrow-despawn-rate'] = formState.world.arrowDespawnRate;
    defaultWorld['trident-despawn-rate'] = formState.world.tridentDespawnRate;
    defaultWorld['zombie-aggressive-towards-villager'] = formState.world.zombieAggressiveTowardsVillager;
    defaultWorld['nerf-spawner-mobs'] = formState.world.nerfSpawnerMobs;
    defaultWorld['enable-zombie-pigmen-portal-spawns'] = formState.world.enableZombiePigmenPortalSpawns;
    defaultWorld['wither-spawn-sound-radius'] = formState.world.witherSpawnSoundRadius;
    defaultWorld['end-portal-sound-radius'] = formState.world.endPortalSoundRadius;
    defaultWorld['hanging-tick-frequency'] = formState.world.hangingTickFrequency;
    defaultWorld['unload-frozen-chunks'] = formState.world.unloadFrozenChunks;

    defaultWorld['merge-radius'] = {
        item: formState.world.mergeRadius.item,
        exp: formState.world.mergeRadius.exp,
    };

    defaultWorld.growth = { ...formState.world.growth };

    defaultWorld['entity-activation-range'] = {
        animals: formState.world.entityActivationRange.animals,
        monsters: formState.world.entityActivationRange.monsters,
        raiders: formState.world.entityActivationRange.raiders,
        misc: formState.world.entityActivationRange.misc,
        water: formState.world.entityActivationRange.water,
        villagers: formState.world.entityActivationRange.villagers,
        'flying-monsters': formState.world.entityActivationRange.flyingMonsters,
        'wake-up-inactive': { ...formState.world.entityActivationRange.wakeUpInactive },
        'villagers-work-immunity-after': formState.world.entityActivationRange['villagers-work-immunity-after'],
        'villagers-work-immunity-for': formState.world.entityActivationRange['villagers-work-immunity-for'],
        'villagers-active-for-panic': formState.world.entityActivationRange['villagers-active-for-panic'],
        'tick-inactive-villagers': formState.world.entityActivationRange['tick-inactive-villagers'],
        'ignore-spectators': formState.world.entityActivationRange['ignore-spectators'],
    };

    defaultWorld['entity-tracking-range'] = {
        players: formState.world.entityTrackingRange.players,
        animals: formState.world.entityTrackingRange.animals,
        monsters: formState.world.entityTrackingRange.monsters,
        misc: formState.world.entityTrackingRange.misc,
        display: formState.world.entityTrackingRange.display,
        other: formState.world.entityTrackingRange.other,
    };

    defaultWorld['ticks-per'] = {
        'hopper-transfer': formState.world.ticksPer['hopper-transfer'],
        'hopper-check': formState.world.ticksPer['hopper-check'],
    };

    defaultWorld['hopper-amount'] = formState.world.hopperAmount;
    defaultWorld['hopper-can-load-chunks'] = formState.world.hopperCanLoadChunks;
    defaultWorld['dragon-death-sound-radius'] = formState.world.dragonDeathSoundRadius;

    seedKeys.forEach((key) => {
        defaultWorld[key] = formState.world.seeds[key];
    });

    defaultWorld.hunger = { ...formState.world.hunger };
    defaultWorld['max-tnt-per-tick'] = formState.world.maxTntPerTick;
    defaultWorld['max-tick-time'] = { ...formState.world.maxTickTime };
    defaultWorld.verbose = formState.world.verbose;

    result.players = result.players ?? {};
    (result.players as Record<string, unknown>)['disable-saving'] = formState.playersDisableSaving;

    result['config-version'] = formState.configVersion;

    result.stats = result.stats ?? {};
    const stats = result.stats as Record<string, unknown>;
    stats['disable-saving'] = formState.statsDisableSaving;
    try {
        stats['forced-stats'] = formState.forcedStatsText.trim().length ? JSON.parse(formState.forcedStatsText) : {};
    } catch (error) {
        console.warn('Invalid forced stats JSON, keeping previous value:', error);
    }

    result.commands = result.commands ?? {};
    const commands = result.commands as Record<string, unknown>;
    commands.log = formState.commands.log;
    commands['tab-complete'] = formState.commands.tabComplete;
    commands['send-namespaced'] = formState.commands.sendNamespaced;
    commands['spam-exclusions'] = formState.commands.spamExclusionsText
        .split('\n')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    commands['silent-commandblock-console'] = formState.commands.silentCommandblockConsole;
    commands['replace-commands'] = formState.commands.replaceCommandsText
        .split('\n')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    commands['enable-spam-exclusions'] = formState.commands.enableSpamExclusions;

    Object.assign(config, result);
}

type SettingsToggleKey =
    | 'bungeecord'
    | 'saveUserCacheOnStopOnly'
    | 'restartOnCrash'
    | 'logVillagerDeaths'
    | 'logNamedDeaths'
    | 'debug';

const settingsToggleFields: Array<{
    key: SettingsToggleKey;
    labelKey: string;
    fallback: string;
    descriptionKey: string;
    description: string;
}> = [
    {
        key: 'bungeecord',
        labelKey: 'spigotConfig.fields.settings.bungeecord.label',
        fallback: 'Enable BungeeCord support',
        descriptionKey: 'spigotConfig.fields.settings.bungeecord.description',
        description: 'Forward IPs and UUIDs from a BungeeCord proxy.',
    },
    {
        key: 'saveUserCacheOnStopOnly',
        labelKey: 'spigotConfig.fields.settings.saveUserCacheOnStopOnly.label',
        fallback: 'Save user cache on stop only',
        descriptionKey: 'spigotConfig.fields.settings.saveUserCacheOnStopOnly.description',
        description: 'Write UUID cache only when the server stops to improve performance.',
    },
    {
        key: 'restartOnCrash',
        labelKey: 'spigotConfig.fields.settings.restartOnCrash.label',
        fallback: 'Restart on crash',
        descriptionKey: 'spigotConfig.fields.settings.restartOnCrash.description',
        description: 'Automatically run the restart script if the server crashes.',
    },
    {
        key: 'logVillagerDeaths',
        labelKey: 'spigotConfig.fields.settings.logVillagerDeaths.label',
        fallback: 'Log villager deaths',
        descriptionKey: 'spigotConfig.fields.settings.logVillagerDeaths.description',
        description: 'Write villager death events to the console for debugging.',
    },
    {
        key: 'logNamedDeaths',
        labelKey: 'spigotConfig.fields.settings.logNamedDeaths.label',
        fallback: 'Log named entity deaths',
        descriptionKey: 'spigotConfig.fields.settings.logNamedDeaths.description',
        description: 'Log deaths of named entities to help track important mobs.',
    },
    {
        key: 'debug',
        labelKey: 'spigotConfig.fields.settings.debug.label',
        fallback: 'Enable debug logging',
        descriptionKey: 'spigotConfig.fields.settings.debug.description',
        description: 'Enable extra debug output for troubleshooting.',
    },
];

type SettingsNumberKey =
    | 'sampleCount'
    | 'playerShuffle'
    | 'userCacheSize'
    | 'movedWronglyThreshold'
    | 'movedTooQuicklyMultiplier'
    | 'timeoutTime'
    | 'nettyThreads';

const settingsNumberFields: Array<{
    key: SettingsNumberKey;
    labelKey: string;
    fallback: string;
    descriptionKey: string;
    description: string;
    step?: number;
}> = [
    {
        key: 'sampleCount',
        labelKey: 'spigotConfig.fields.settings.sampleCount.label',
        fallback: 'Sample count',
        descriptionKey: 'spigotConfig.fields.settings.sampleCount.description',
        description: 'Number of players sampled for TPS calculations.',
    },
    {
        key: 'playerShuffle',
        labelKey: 'spigotConfig.fields.settings.playerShuffle.label',
        fallback: 'Player shuffle interval',
        descriptionKey: 'spigotConfig.fields.settings.playerShuffle.description',
        description: 'How often the player list is shuffled to balance ticking.',
    },
    {
        key: 'userCacheSize',
        labelKey: 'spigotConfig.fields.settings.userCacheSize.label',
        fallback: 'User cache size',
        descriptionKey: 'spigotConfig.fields.settings.userCacheSize.description',
        description: 'Maximum number of player UUIDs cached locally.',
    },
    {
        key: 'movedWronglyThreshold',
        labelKey: 'spigotConfig.fields.settings.movedWronglyThreshold.label',
        fallback: 'Moved wrongly threshold',
        descriptionKey: 'spigotConfig.fields.settings.movedWronglyThreshold.description',
        description: 'Distance before players are flagged for incorrect movement.',
        step: 0.0001,
    },
    {
        key: 'movedTooQuicklyMultiplier',
        labelKey: 'spigotConfig.fields.settings.movedTooQuicklyMultiplier.label',
        fallback: 'Moved too quickly multiplier',
        descriptionKey: 'spigotConfig.fields.settings.movedTooQuicklyMultiplier.description',
        description: 'Multiplier applied when checking fast movement.',
        step: 0.1,
    },
    {
        key: 'timeoutTime',
        labelKey: 'spigotConfig.fields.settings.timeoutTime.label',
        fallback: 'Timeout time',
        descriptionKey: 'spigotConfig.fields.settings.timeoutTime.description',
        description: 'Minutes before a connection is considered timed out.',
    },
    {
        key: 'nettyThreads',
        labelKey: 'spigotConfig.fields.settings.nettyThreads.label',
        fallback: 'Netty threads',
        descriptionKey: 'spigotConfig.fields.settings.nettyThreads.description',
        description: 'Number of Netty IO threads used by the server.',
    },
];

const attributeFields = [
    {
        key: 'maxAbsorption' as const,
        labelKey: 'spigotConfig.fields.settings.attribute.maxAbsorption',
        fallback: 'Max absorption',
        step: 1,
    },
    {
        key: 'maxHealth' as const,
        labelKey: 'spigotConfig.fields.settings.attribute.maxHealth',
        fallback: 'Max health',
        step: 1,
    },
    {
        key: 'movementSpeed' as const,
        labelKey: 'spigotConfig.fields.settings.attribute.movementSpeed',
        fallback: 'Max movement speed',
        step: 0.1,
    },
    {
        key: 'attackDamage' as const,
        labelKey: 'spigotConfig.fields.settings.attribute.attackDamage',
        fallback: 'Max attack damage',
        step: 1,
    },
];

const messageFields = [
    {
        key: 'whitelist' as const,
        labelKey: 'spigotConfig.fields.messages.whitelist',
        fallback: 'Whitelist message',
    },
    {
        key: 'unknownCommand' as const,
        labelKey: 'spigotConfig.fields.messages.unknownCommand',
        fallback: 'Unknown command message',
    },
    {
        key: 'serverFull' as const,
        labelKey: 'spigotConfig.fields.messages.serverFull',
        fallback: 'Server full message',
    },
    {
        key: 'outdatedClient' as const,
        labelKey: 'spigotConfig.fields.messages.outdatedClient',
        fallback: 'Outdated client message',
    },
    {
        key: 'outdatedServer' as const,
        labelKey: 'spigotConfig.fields.messages.outdatedServer',
        fallback: 'Outdated server message',
    },
    {
        key: 'restart' as const,
        labelKey: 'spigotConfig.fields.messages.restart',
        fallback: 'Restart message',
    },
];

type WorldToggleKey =
    | 'belowZeroGenerationInExistingChunks'
    | 'zombieAggressiveTowardsVillager'
    | 'nerfSpawnerMobs'
    | 'enableZombiePigmenPortalSpawns'
    | 'unloadFrozenChunks';

const worldToggleFields: Array<{
    key: WorldToggleKey;
    labelKey: string;
    fallback: string;
    descriptionKey: string;
    description: string;
}> = [
    {
        key: 'belowZeroGenerationInExistingChunks',
        labelKey: 'spigotConfig.fields.world.belowZeroGenerationInExistingChunks.label',
        fallback: 'Below-zero generation in existing chunks',
        descriptionKey: 'spigotConfig.fields.world.belowZeroGenerationInExistingChunks.description',
        description: 'Enable 1.18 terrain below Y=0 in already generated chunks.',
    },
    {
        key: 'zombieAggressiveTowardsVillager',
        labelKey: 'spigotConfig.fields.world.zombieAggressiveTowardsVillager.label',
        fallback: 'Zombies attack villagers',
        descriptionKey: 'spigotConfig.fields.world.zombieAggressiveTowardsVillager.description',
        description: 'Zombies will target villagers by default.',
    },
    {
        key: 'nerfSpawnerMobs',
        labelKey: 'spigotConfig.fields.world.nerfSpawnerMobs.label',
        fallback: 'Nerf spawner mobs',
        descriptionKey: 'spigotConfig.fields.world.nerfSpawnerMobs.description',
        description: 'Disable AI for mobs spawned from monster spawners.',
    },
    {
        key: 'enableZombiePigmenPortalSpawns',
        labelKey: 'spigotConfig.fields.world.enableZombiePigmenPortalSpawns.label',
        fallback: 'Portal Zombified Piglin spawns',
        descriptionKey: 'spigotConfig.fields.world.enableZombiePigmenPortalSpawns.description',
        description: 'Allow zombified piglins to spawn from Nether portals.',
    },
    {
        key: 'unloadFrozenChunks',
        labelKey: 'spigotConfig.fields.world.unloadFrozenChunks.label',
        fallback: 'Unload frozen chunks',
        descriptionKey: 'spigotConfig.fields.world.unloadFrozenChunks.description',
        description: 'Allow chunks locked by tickets to unload when idle.',
    },
];

type WorldNumberKey =
    | 'mobSpawnRange'
    | 'itemDespawnRate'
    | 'thunderChance'
    | 'arrowDespawnRate'
    | 'tridentDespawnRate'
    | 'hangingTickFrequency';

const worldNumberFields: Array<{
    key: WorldNumberKey;
    labelKey: string;
    fallback: string;
    descriptionKey: string;
    description: string;
    step?: number;
}> = [
    {
        key: 'mobSpawnRange',
        labelKey: 'spigotConfig.fields.world.mobSpawnRange.label',
        fallback: 'Mob spawn range',
        descriptionKey: 'spigotConfig.fields.world.mobSpawnRange.description',
        description: 'Chunk radius used when attempting mob spawns.',
    },
    {
        key: 'itemDespawnRate',
        labelKey: 'spigotConfig.fields.world.itemDespawnRate.label',
        fallback: 'Item despawn rate',
        descriptionKey: 'spigotConfig.fields.world.itemDespawnRate.description',
        description: 'Ticks before ground items disappear (20 ticks = 1 second).',
    },
    {
        key: 'thunderChance',
        labelKey: 'spigotConfig.fields.world.thunderChance.label',
        fallback: 'Thunder chance',
        descriptionKey: 'spigotConfig.fields.world.thunderChance.description',
        description: 'One in N chance of thunder during storms.',
    },
    {
        key: 'arrowDespawnRate',
        labelKey: 'spigotConfig.fields.world.arrowDespawnRate.label',
        fallback: 'Arrow despawn rate',
        descriptionKey: 'spigotConfig.fields.world.arrowDespawnRate.description',
        description: 'Ticks before arrows despawn.',
    },
    {
        key: 'tridentDespawnRate',
        labelKey: 'spigotConfig.fields.world.tridentDespawnRate.label',
        fallback: 'Trident despawn rate',
        descriptionKey: 'spigotConfig.fields.world.tridentDespawnRate.description',
        description: 'Ticks before tridents despawn.',
    },
    {
        key: 'hangingTickFrequency',
        labelKey: 'spigotConfig.fields.world.hangingTickFrequency.label',
        fallback: 'Hanging entity tick frequency',
        descriptionKey: 'spigotConfig.fields.world.hangingTickFrequency.description',
        description: 'Tick rate for paintings, item frames, and other hanging entities.',
    },
];

const entityActivationFields = [
    {
        key: 'animals' as const,
        labelKey: 'spigotConfig.fields.entityActivationRange.animals',
        fallback: 'Animals',
    },
    {
        key: 'monsters' as const,
        labelKey: 'spigotConfig.fields.entityActivationRange.monsters',
        fallback: 'Monsters',
    },
    {
        key: 'raiders' as const,
        labelKey: 'spigotConfig.fields.entityActivationRange.raiders',
        fallback: 'Raiders',
    },
    {
        key: 'misc' as const,
        labelKey: 'spigotConfig.fields.entityActivationRange.misc',
        fallback: 'Misc',
    },
    {
        key: 'water' as const,
        labelKey: 'spigotConfig.fields.entityActivationRange.water',
        fallback: 'Water mobs',
    },
    {
        key: 'villagers' as const,
        labelKey: 'spigotConfig.fields.entityActivationRange.villagers',
        fallback: 'Villagers',
    },
    {
        key: 'flyingMonsters' as const,
        labelKey: 'spigotConfig.fields.entityActivationRange.flyingMonsters',
        fallback: 'Flying monsters',
    },
];

const entityActivationToggleFields = [
    {
        key: 'villagers-work-immunity-after' as const,
        labelKey: 'spigotConfig.fields.entityActivationRange.villagersWorkImmunityAfter',
        fallback: 'Villager work immunity (after)',
        descriptionKey: 'spigotConfig.fields.entityActivationRange.villagersWorkImmunityAfterDescription',
        description: 'Ticks after finishing work before villager AI is reduced.',
    },
    {
        key: 'villagers-work-immunity-for' as const,
        labelKey: 'spigotConfig.fields.entityActivationRange.villagersWorkImmunityFor',
        fallback: 'Villager work immunity (duration)',
        descriptionKey: 'spigotConfig.fields.entityActivationRange.villagersWorkImmunityForDescription',
        description: 'Duration villagers stay active after working.',
    },
    {
        key: 'villagers-active-for-panic' as const,
        labelKey: 'spigotConfig.fields.entityActivationRange.villagersActiveForPanic',
        fallback: 'Villagers active during panic',
        descriptionKey: 'spigotConfig.fields.entityActivationRange.villagersActiveForPanicDescription',
        description: 'Keep villagers active when panicking.',
    },
    {
        key: 'tick-inactive-villagers' as const,
        labelKey: 'spigotConfig.fields.entityActivationRange.tickInactiveVillagers',
        fallback: 'Tick inactive villagers',
        descriptionKey: 'spigotConfig.fields.entityActivationRange.tickInactiveVillagersDescription',
        description: 'Always tick villagers even when outside activation range.',
    },
    {
        key: 'ignore-spectators' as const,
        labelKey: 'spigotConfig.fields.entityActivationRange.ignoreSpectators',
        fallback: 'Ignore spectators',
        descriptionKey: 'spigotConfig.fields.entityActivationRange.ignoreSpectatorsDescription',
        description: 'Do not activate entities for players in spectator mode.',
    },
];

const entityTrackingFields = [
    {
        key: 'players' as const,
        labelKey: 'spigotConfig.fields.entityTrackingRange.players',
        fallback: 'Players',
    },
    {
        key: 'animals' as const,
        labelKey: 'spigotConfig.fields.entityTrackingRange.animals',
        fallback: 'Animals',
    },
    {
        key: 'monsters' as const,
        labelKey: 'spigotConfig.fields.entityTrackingRange.monsters',
        fallback: 'Monsters',
    },
    {
        key: 'misc' as const,
        labelKey: 'spigotConfig.fields.entityTrackingRange.misc',
        fallback: 'Misc',
    },
    {
        key: 'display' as const,
        labelKey: 'spigotConfig.fields.entityTrackingRange.display',
        fallback: 'Display',
    },
    {
        key: 'other' as const,
        labelKey: 'spigotConfig.fields.entityTrackingRange.other',
        fallback: 'Other',
    },
];

const tickRateFields = [
    {
        key: 'hopper-transfer' as const,
        labelKey: 'spigotConfig.fields.world.ticksPer.hopperTransfer',
        fallback: 'Hopper transfer',
    },
    {
        key: 'hopper-check' as const,
        labelKey: 'spigotConfig.fields.world.ticksPer.hopperCheck',
        fallback: 'Hopper check',
    },
];

const handleSave = () => {
    const cloned = parseYaml(stringifyYaml(originalConfig.data)) as SpigotYaml;
    applyFormToConfig(cloned, form);
    const yamlOutput = stringifyYaml(cloned, { lineWidth: 0 });
    emit('save', yamlOutput);
};

const handleSwitchToRaw = () => {
    emit('switchToRaw');
};

function formatKeyLabel(key: string): string {
    return key
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
</script>

<template>
    <Card class="border-primary/20">
        <CardHeader class="border-b border-border/40">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="space-y-2">
                    <CardTitle class="text-2xl font-bold">
                        {{ t('spigotConfig.title') }}
                    </CardTitle>
                    <CardDescription class="text-sm text-muted-foreground">
                        {{ t('spigotConfig.description') }}
                    </CardDescription>
                </div>
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" @click="handleSwitchToRaw">
                        <ArrowLeft class="mr-2 h-4 w-4" />
                        {{ t('spigotConfig.actions.switchToRaw') }}
                    </Button>
                    <Button size="sm" :disabled="props.readonly || props.saving" @click="handleSave">
                        <Save class="mr-2 h-4 w-4" />
                        <span v-if="props.saving">{{ t('spigotConfig.actions.saving') }}</span>
                        <span v-else>{{ t('spigotConfig.actions.save') }}</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent class="space-y-10 p-6">
            <section class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Settings2 class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('spigotConfig.sections.settings') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{ t('spigotConfig.sectionsDescriptions.settings') }}
                        </p>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div
                        v-for="field in settingsToggleFields"
                        :key="field.key"
                        class="space-y-3 rounded-lg border p-4 shadow-sm"
                    >
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label :for="`spigot-toggle-${field.key}`" class="text-sm font-semibold">
                                    {{ t(field.labelKey, { defaultValue: field.fallback }) }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t(field.descriptionKey, { defaultValue: field.description }) }}
                                </p>
                            </div>
                            <input
                                :id="`spigot-toggle-${field.key}`"
                                v-model="form.settings[field.key]"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="spigot-checkbox"
                            />
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div
                        v-for="field in settingsNumberFields"
                        :key="field.key"
                        class="space-y-2 rounded-lg border p-4 shadow-sm"
                    >
                        <Label :for="`spigot-setting-${field.key}`" class="text-sm font-semibold">
                            {{ t(field.labelKey, { defaultValue: field.fallback }) }}
                        </Label>
                        <Input
                            :id="`spigot-setting-${field.key}`"
                            v-model.number="form.settings[field.key]"
                            type="number"
                            :step="field.step"
                            :disabled="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t(field.descriptionKey, { defaultValue: field.description }) }}
                        </p>
                    </div>
                </div>

                <div class="space-y-4 rounded-lg border p-4 shadow-sm">
                    <h4 class="text-sm font-semibold">{{ t('spigotConfig.sections.attributeLimits') }}</h4>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div v-for="field in attributeFields" :key="field.key" class="space-y-2">
                            <Label :for="`spigot-attribute-${field.key}`" class="text-sm font-semibold">
                                {{ t(field.labelKey, { defaultValue: field.fallback }) }}
                            </Label>
                            <Input
                                :id="`spigot-attribute-${field.key}`"
                                v-model.number="form.settings.attribute[field.key]"
                                type="number"
                                :step="field.step"
                                :disabled="props.readonly"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <MessageSquare class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('spigotConfig.sections.messages') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{ t('spigotConfig.sectionsDescriptions.messages') }}
                        </p>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div v-for="field in messageFields" :key="field.key" class="space-y-2">
                        <Label :for="`spigot-message-${field.key}`" class="text-sm font-semibold">
                            {{ t(field.labelKey, { defaultValue: field.fallback }) }}
                        </Label>
                        <Textarea
                            :id="`spigot-message-${field.key}`"
                            v-model="form.messages[field.key]"
                            rows="2"
                            :readonly="props.readonly"
                        />
                    </div>
                </div>
            </section>

            <section class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ListChecks class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('spigotConfig.sections.advancements') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{ t('spigotConfig.sectionsDescriptions.advancements') }}
                        </p>
                    </div>
                </div>
                <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                    <div class="flex items-start justify-between gap-4">
                        <div class="space-y-1">
                            <Label for="spigot-advancements-disable" class="text-sm font-semibold">
                                {{ t('spigotConfig.fields.advancements.disableSaving.label') }}
                            </Label>
                            <p class="text-xs text-muted-foreground">
                                {{ t('spigotConfig.fields.advancements.disableSaving.description') }}
                            </p>
                        </div>
                        <input
                            id="spigot-advancements-disable"
                            v-model="form.advancements.disableSaving"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="spigot-checkbox"
                        />
                    </div>
                    <div class="space-y-2">
                        <Label for="spigot-advancements-disabled" class="text-sm font-semibold">
                            {{ t('spigotConfig.fields.advancements.disabled.label') }}
                        </Label>
                        <Textarea
                            id="spigot-advancements-disabled"
                            v-model="form.advancements.disabledList"
                            rows="3"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('spigotConfig.fields.advancements.disabled.description') }}
                        </p>
                    </div>
                </div>
            </section>

            <section class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Map class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('spigotConfig.sections.worldSettings') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{ t('spigotConfig.sectionsDescriptions.worldSettings') }}
                        </p>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div
                        v-for="field in worldToggleFields"
                        :key="field.key"
                        class="space-y-3 rounded-lg border p-4 shadow-sm"
                    >
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label :for="`spigot-world-toggle-${field.key}`" class="text-sm font-semibold">
                                    {{ t(field.labelKey, { defaultValue: field.fallback }) }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t(field.descriptionKey, { defaultValue: field.description }) }}
                                </p>
                            </div>
                            <input
                                :id="`spigot-world-toggle-${field.key}`"
                                v-model="form.world[field.key]"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="spigot-checkbox"
                            />
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div
                        v-for="field in worldNumberFields"
                        :key="field.key"
                        class="space-y-2 rounded-lg border p-4 shadow-sm"
                    >
                        <Label :for="`spigot-world-number-${field.key}`" class="text-sm font-semibold">
                            {{ t(field.labelKey, { defaultValue: field.fallback }) }}
                        </Label>
                        <Input
                            :id="`spigot-world-number-${field.key}`"
                            v-model.number="form.world[field.key]"
                            type="number"
                            :step="field.step"
                            :disabled="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t(field.descriptionKey, { defaultValue: field.description }) }}
                        </p>
                    </div>
                </div>

                <div class="space-y-4 rounded-lg border p-4 shadow-sm">
                    <h4 class="text-sm font-semibold">{{ t('spigotConfig.sections.mergeRadius') }}</h4>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div v-for="key in mergeRadiusKeys" :key="key" class="space-y-2">
                            <Label :for="`spigot-merge-${key}`" class="text-sm font-semibold">
                                {{ t(`spigotConfig.fields.mergeRadius.${key}`, { defaultValue: formatKeyLabel(key) }) }}
                            </Label>
                            <Input
                                :id="`spigot-merge-${key}`"
                                v-model.number="form.world.mergeRadius[key]"
                                type="number"
                                step="0.1"
                                :disabled="props.readonly"
                            />
                        </div>
                    </div>
                </div>

                <div class="space-y-4 rounded-lg border p-4 shadow-sm">
                    <h4 class="text-sm font-semibold">{{ t('spigotConfig.sections.growthRates') }}</h4>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div v-for="key in growthKeys" :key="key" class="space-y-2">
                            <Label :for="`spigot-growth-${key}`" class="text-sm font-semibold">
                                {{ t(`spigotConfig.fields.growth.${key}`, { defaultValue: formatKeyLabel(key) }) }}
                            </Label>
                            <Input
                                :id="`spigot-growth-${key}`"
                                v-model.number="form.world.growth[key]"
                                type="number"
                                :disabled="props.readonly"
                            />
                        </div>
                    </div>
                </div>

                <div class="space-y-4 rounded-lg border p-4 shadow-sm">
                    <h4 class="text-sm font-semibold">{{ t('spigotConfig.sections.entityActivationRange') }}</h4>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div v-for="field in entityActivationFields" :key="field.key" class="space-y-2">
                            <Label :for="`spigot-activation-${field.key}`" class="text-sm font-semibold">
                                {{ t(field.labelKey, { defaultValue: field.fallback }) }}
                            </Label>
                            <Input
                                :id="`spigot-activation-${field.key}`"
                                v-model.number="form.world.entityActivationRange[field.key]"
                                type="number"
                                :disabled="props.readonly"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div v-for="key in wakeUpKeys" :key="key" class="space-y-2">
                            <Label :for="`spigot-wakeup-${key}`" class="text-sm font-semibold">
                                {{
                                    t(`spigotConfig.fields.entityActivationRange.${key}`, {
                                        defaultValue: formatKeyLabel(key),
                                    })
                                }}
                            </Label>
                            <Input
                                :id="`spigot-wakeup-${key}`"
                                v-model.number="form.world.entityActivationRange.wakeUpInactive[key]"
                                type="number"
                                :disabled="props.readonly"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div
                            v-for="field in entityActivationToggleFields"
                            :key="field.key"
                            class="space-y-3 rounded-lg border p-4 shadow-sm"
                        >
                            <div class="flex items-start justify-between gap-4">
                                <div class="space-y-1">
                                    <Label :for="`spigot-activation-toggle-${field.key}`" class="text-sm font-semibold">
                                        {{ t(field.labelKey, { defaultValue: field.fallback }) }}
                                    </Label>
                                    <p class="text-xs text-muted-foreground">
                                        {{ t(field.descriptionKey, { defaultValue: field.description }) }}
                                    </p>
                                </div>
                                <input
                                    :id="`spigot-activation-toggle-${field.key}`"
                                    v-model="form.world.entityActivationRange[field.key]"
                                    type="checkbox"
                                    :disabled="props.readonly"
                                    class="spigot-checkbox"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-4 rounded-lg border p-4 shadow-sm">
                    <h4 class="text-sm font-semibold">{{ t('spigotConfig.sections.entityTrackingRange') }}</h4>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div v-for="field in entityTrackingFields" :key="field.key" class="space-y-2">
                            <Label :for="`spigot-tracking-${field.key}`" class="text-sm font-semibold">
                                {{ t(field.labelKey, { defaultValue: field.fallback }) }}
                            </Label>
                            <Input
                                :id="`spigot-tracking-${field.key}`"
                                v-model.number="form.world.entityTrackingRange[field.key]"
                                type="number"
                                :disabled="props.readonly"
                            />
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div
                        v-for="field in tickRateFields"
                        :key="field.key"
                        class="space-y-2 rounded-lg border p-4 shadow-sm"
                    >
                        <Label :for="`spigot-tick-${field.key}`" class="text-sm font-semibold">
                            {{ t(field.labelKey, { defaultValue: field.fallback }) }}
                        </Label>
                        <Input
                            :id="`spigot-tick-${field.key}`"
                            v-model.number="form.world.ticksPer[field.key]"
                            type="number"
                            :disabled="props.readonly"
                        />
                    </div>
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="spigot-hopper-amount" class="text-sm font-semibold">
                            {{ t('spigotConfig.fields.world.hopperAmount.label') }}
                        </Label>
                        <Input
                            id="spigot-hopper-amount"
                            v-model.number="form.world.hopperAmount"
                            type="number"
                            :disabled="props.readonly"
                        />
                    </div>
                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="spigot-hopper-chunks" class="text-sm font-semibold">
                                    {{ t('spigotConfig.fields.world.hopperCanLoadChunks.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('spigotConfig.fields.world.hopperCanLoadChunks.description') }}
                                </p>
                            </div>
                            <input
                                id="spigot-hopper-chunks"
                                v-model="form.world.hopperCanLoadChunks"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="spigot-checkbox"
                            />
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="spigot-dragon-sound" class="text-sm font-semibold">
                            {{ t('spigotConfig.fields.world.dragonDeathSoundRadius.label') }}
                        </Label>
                        <Input
                            id="spigot-dragon-sound"
                            v-model.number="form.world.dragonDeathSoundRadius"
                            type="number"
                            :disabled="props.readonly"
                        />
                    </div>
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="spigot-wither-sound" class="text-sm font-semibold">
                            {{ t('spigotConfig.fields.world.witherSpawnSoundRadius.label') }}
                        </Label>
                        <Input
                            id="spigot-wither-sound"
                            v-model.number="form.world.witherSpawnSoundRadius"
                            type="number"
                            :disabled="props.readonly"
                        />
                    </div>
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="spigot-end-portal-sound" class="text-sm font-semibold">
                            {{ t('spigotConfig.fields.world.endPortalSoundRadius.label') }}
                        </Label>
                        <Input
                            id="spigot-end-portal-sound"
                            v-model.number="form.world.endPortalSoundRadius"
                            type="number"
                            :disabled="props.readonly"
                        />
                    </div>
                </div>

                <div class="space-y-4 rounded-lg border p-4 shadow-sm">
                    <h4 class="text-sm font-semibold">{{ t('spigotConfig.sections.seeds') }}</h4>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div v-for="key in seedKeys" :key="key" class="space-y-2">
                            <Label :for="`spigot-seed-${key}`" class="text-sm font-semibold">
                                {{ t(`spigotConfig.fields.seeds.${key}`, { defaultValue: formatKeyLabel(key) }) }}
                            </Label>
                            <Input
                                :id="`spigot-seed-${key}`"
                                v-model="form.world.seeds[key]"
                                type="text"
                                :readonly="props.readonly"
                            />
                        </div>
                    </div>
                </div>

                <div class="space-y-4 rounded-lg border p-4 shadow-sm">
                    <h4 class="text-sm font-semibold">{{ t('spigotConfig.sections.hunger') }}</h4>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div v-for="key in hungerKeys" :key="key" class="space-y-2">
                            <Label :for="`spigot-hunger-${key}`" class="text-sm font-semibold">
                                {{ t(`spigotConfig.fields.hunger.${key}`, { defaultValue: formatKeyLabel(key) }) }}
                            </Label>
                            <Input
                                :id="`spigot-hunger-${key}`"
                                v-model.number="form.world.hunger[key]"
                                type="number"
                                step="0.01"
                                :disabled="props.readonly"
                            />
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="spigot-max-tnt" class="text-sm font-semibold">
                            {{ t('spigotConfig.fields.world.maxTntPerTick.label') }}
                        </Label>
                        <Input
                            id="spigot-max-tnt"
                            v-model.number="form.world.maxTntPerTick"
                            type="number"
                            :disabled="props.readonly"
                        />
                    </div>
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="spigot-max-tick-tile" class="text-sm font-semibold">
                            {{ t('spigotConfig.fields.world.maxTickTime.tile') }}
                        </Label>
                        <Input
                            id="spigot-max-tick-tile"
                            v-model.number="form.world.maxTickTime.tile"
                            type="number"
                            :disabled="props.readonly"
                        />
                    </div>
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="spigot-max-tick-entity" class="text-sm font-semibold">
                            {{ t('spigotConfig.fields.world.maxTickTime.entity') }}
                        </Label>
                        <Input
                            id="spigot-max-tick-entity"
                            v-model.number="form.world.maxTickTime.entity"
                            type="number"
                            :disabled="props.readonly"
                        />
                    </div>
                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="spigot-world-verbose" class="text-sm font-semibold">
                                    {{ t('spigotConfig.fields.world.verbose.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('spigotConfig.fields.world.verbose.description') }}
                                </p>
                            </div>
                            <input
                                id="spigot-world-verbose"
                                v-model="form.world.verbose"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="spigot-checkbox"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Users class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('spigotConfig.sections.playersStats') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{ t('spigotConfig.sectionsDescriptions.playersStats') }}
                        </p>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="spigot-players-disable" class="text-sm font-semibold">
                                    {{ t('spigotConfig.fields.players.disableSaving.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('spigotConfig.fields.players.disableSaving.description') }}
                                </p>
                            </div>
                            <input
                                id="spigot-players-disable"
                                v-model="form.playersDisableSaving"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="spigot-checkbox"
                            />
                        </div>
                    </div>
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="spigot-config-version" class="text-sm font-semibold">
                            {{ t('spigotConfig.fields.configVersion.label') }}
                        </Label>
                        <Input
                            id="spigot-config-version"
                            v-model.number="form.configVersion"
                            type="number"
                            :disabled="props.readonly"
                        />
                    </div>
                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="spigot-stats-disable" class="text-sm font-semibold">
                                    {{ t('spigotConfig.fields.stats.disableSaving.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('spigotConfig.fields.stats.disableSaving.description') }}
                                </p>
                            </div>
                            <input
                                id="spigot-stats-disable"
                                v-model="form.statsDisableSaving"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="spigot-checkbox"
                            />
                        </div>
                    </div>
                </div>

                <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                    <Label for="spigot-forced-stats" class="text-sm font-semibold">
                        {{ t('spigotConfig.fields.stats.forcedStats.label') }}
                    </Label>
                    <Textarea
                        id="spigot-forced-stats"
                        v-model="form.forcedStatsText"
                        rows="4"
                        :readonly="props.readonly"
                    />
                    <p class="text-xs text-muted-foreground">
                        {{ t('spigotConfig.fields.stats.forcedStats.description') }}
                    </p>
                </div>
            </section>

            <section class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Command class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('spigotConfig.sections.commands') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{ t('spigotConfig.sectionsDescriptions.commands') }}
                        </p>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="spigot-command-log" class="text-sm font-semibold">
                                    {{ t('spigotConfig.fields.commands.log.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('spigotConfig.fields.commands.log.description') }}
                                </p>
                            </div>
                            <input
                                id="spigot-command-log"
                                v-model="form.commands.log"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="spigot-checkbox"
                            />
                        </div>
                    </div>
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="spigot-tab-complete" class="text-sm font-semibold">
                            {{ t('spigotConfig.fields.commands.tabComplete.label') }}
                        </Label>
                        <Input
                            id="spigot-tab-complete"
                            v-model.number="form.commands.tabComplete"
                            type="number"
                            min="-1"
                            :disabled="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('spigotConfig.fields.commands.tabComplete.description') }}
                        </p>
                    </div>
                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="spigot-send-namespaced" class="text-sm font-semibold">
                                    {{ t('spigotConfig.fields.commands.sendNamespaced.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('spigotConfig.fields.commands.sendNamespaced.description') }}
                                </p>
                            </div>
                            <input
                                id="spigot-send-namespaced"
                                v-model="form.commands.sendNamespaced"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="spigot-checkbox"
                            />
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="spigot-spam-exclusions" class="text-sm font-semibold">
                            {{ t('spigotConfig.fields.commands.spamExclusions.label') }}
                        </Label>
                        <Textarea
                            id="spigot-spam-exclusions"
                            v-model="form.commands.spamExclusionsText"
                            rows="3"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('spigotConfig.fields.commands.spamExclusions.description') }}
                        </p>
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="spigot-enable-spam-exclusions" class="text-sm font-semibold">
                                    {{ t('spigotConfig.fields.commands.enableSpamExclusions.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('spigotConfig.fields.commands.enableSpamExclusions.description') }}
                                </p>
                            </div>
                            <input
                                id="spigot-enable-spam-exclusions"
                                v-model="form.commands.enableSpamExclusions"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="spigot-checkbox"
                            />
                        </div>
                    </div>
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="spigot-replace-commands" class="text-sm font-semibold">
                            {{ t('spigotConfig.fields.commands.replaceCommands.label') }}
                        </Label>
                        <Textarea
                            id="spigot-replace-commands"
                            v-model="form.commands.replaceCommandsText"
                            rows="3"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('spigotConfig.fields.commands.replaceCommands.description') }}
                        </p>
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="spigot-silent-commandblock" class="text-sm font-semibold">
                                    {{ t('spigotConfig.fields.commands.silentCommandblockConsole.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('spigotConfig.fields.commands.silentCommandblockConsole.description') }}
                                </p>
                            </div>
                            <input
                                id="spigot-silent-commandblock"
                                v-model="form.commands.silentCommandblockConsole"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="spigot-checkbox"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </CardContent>
    </Card>
</template>

<style scoped>
.spigot-checkbox {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.4rem;
    border: 2px solid hsl(var(--border));
    background-color: hsl(var(--background));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    transition:
        border-color 0.15s ease,
        background-color 0.15s ease,
        box-shadow 0.15s ease,
        transform 0.1s ease;
}

.spigot-checkbox::after {
    content: '';
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 0.2rem;
    background-color: transparent;
    transition: background-color 0.15s ease;
}

.spigot-checkbox:hover:not(:disabled) {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
}

.spigot-checkbox:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
}

.spigot-checkbox:active:not(:disabled) {
    transform: scale(0.96);
}

.spigot-checkbox:checked {
    background-color: hsl(var(--primary));
    border-color: hsl(var(--primary));
}

.spigot-checkbox:checked::after {
    background-color: hsl(var(--primary-foreground));
}

.spigot-checkbox:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.spigot-checkbox:disabled::after {
    background-color: transparent;
}
</style>
