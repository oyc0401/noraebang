import { yorushikaArtist, yorushikaSongs } from './yorushika';
import { higedanArtist, higedanSongs } from './higedan';
import { mrsGreenAppleArtist, mrsGreenAppleSongs } from './mrs-green-apple';
import { yonezuKenshiArtist, yonezuKenshiSongs } from './yonezu-kenshi';
import { yuikaArtist, yuikaSongs } from './yuika';
import { yoasobiArtist, yoasobiSongs } from './yoasobi';

export const allArtists = [yorushikaArtist, higedanArtist, mrsGreenAppleArtist, yonezuKenshiArtist, yuikaArtist, yoasobiArtist];

export const allSongs = [...yorushikaSongs, ...higedanSongs, ...mrsGreenAppleSongs, ...yonezuKenshiSongs, ...yuikaSongs, ...yoasobiSongs];
