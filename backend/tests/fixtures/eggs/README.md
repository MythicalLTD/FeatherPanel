# Egg import fixtures

Real eggs from the [pelican-eggs](https://github.com/pelican-eggs) repositories, used by
`tests/Services/Spells/EggImportParserTest.php`.

| File | Format | Source |
| --- | --- | --- |
| `ptdl_v2-paper.json` | PTDL_v2 JSON | `minecraft/java/paper/pterodactyl-egg-paper.json` |
| `ptdl_v2-rust.json` | PTDL_v2 JSON | `games-steamcmd/rust/vanilla/egg-pterodactyl-rust.json` |
| `ptdl_v2-nodejs.json` | PTDL_v2 JSON | `generic/nodejs/egg-pterodactyl-nodejs-generic.json` |
| `plcn_v1-left4dead2.json` | PLCN_v1 JSON | `games-steamcmd/left4dead_2/egg-left4-dead2.json` |
| `plcn_v1-veloren.json` | PLCN_v1 JSON | `games-standalone/veloren/egg-veloren.json` |
| `plcn_v2-arma-reforger.json` | PLCN_v2 JSON | `games-steamcmd/arma/arma_reforger/egg-arma-reforger.json` |
| `plcn_v3-folia.json` | PLCN_v3 JSON | `minecraft/java/folia/egg-folia.json` |
| `plcn_v3-nightingale.json` | PLCN_v3 JSON, two startup commands | `games-steamcmd/nightingale/egg-nightingale.json` |
| `plcn_v3-paper.yaml` | PLCN_v3 YAML | `minecraft/java/paper/egg-paper.yaml` |
| `plcn_v3-rust.yaml` | PLCN_v3 YAML | `games-steamcmd/rust/vanilla/egg-rust.yaml` |
| `plcn_v3-nodejs.yaml` | PLCN_v3 YAML | `generic/nodejs/egg-nodejs-generic.yaml` |
| `plcn_v1-left4dead2.yaml` | PLCN_v1 YAML | YAML dump of `plcn_v1-left4dead2.json` |
| `plcn_v2-arma-reforger.yaml` | PLCN_v2 YAML | YAML dump of `plcn_v2-arma-reforger.json` |

The pelican-eggs repositories publish PLCN_v1 and PLCN_v2 only as JSON, so the two YAML
variants were produced with Symfony YAML the same way the Pelican exporter writes YAML.
Fetched on 2026-11-26 (minecraft `c6f2262`, games-steamcmd `0547150`, generic `eec3d4b`).
