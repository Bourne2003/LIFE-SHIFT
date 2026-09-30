import './styles.css';
import { createGame } from './game/createGame';
import { installDebugApi } from './game/debug';

const parent = document.getElementById('game');
if (!parent) throw new Error('Missing #game container');

const game = createGame(parent);

if (import.meta.env.DEV) installDebugApi(game);
