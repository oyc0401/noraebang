import { yorushikaArtist, yorushikaSongs } from './yorushika';
import { higedanArtist, higedanSongs } from './higedan';
import { mrsGreenAppleArtist, mrsGreenAppleSongs } from './mrs-green-apple';

export const allArtists = [yorushikaArtist, higedanArtist, mrsGreenAppleArtist];

export const allSongs = [...yorushikaSongs, ...higedanSongs, ...mrsGreenAppleSongs];
