import './styles.css';
import { loadContent } from '@life-shift/game-data';
import { createGame } from './game/createGame';
import { installDebugApi } from './game/debug';
import { createServices } from './game/services';
import { mountUi } from './ui/mountUi';

const parent = document.getElementById('game');
const uiRoot = document.getElementById('ui');
if (!parent || !uiRoot) throw new Error('Missing #game or #ui container');

const services = createServices(loadContent());
const game = createGame(parent, services);
mountUi(uiRoot, services);

if (import.meta.env.DEV) installDebugApi(game, services);
