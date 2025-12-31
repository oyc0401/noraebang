import { parseTJArtist } from './artist-parser';

describe('parseTJArtist', () => {
  describe('기본 케이스', () => {
    it('빈 문자열은 빈 배열을 반환해야 함', () => {
      const result = parseTJArtist('');
      expect(result).toEqual({
        artist: [],
        feature: [],
        producer: [],
      });
    });

    it('공백만 있는 문자열은 빈 배열을 반환해야 함', () => {
      const result = parseTJArtist('   ');
      expect(result).toEqual({
        artist: [],
        feature: [],
        producer: [],
      });
    });

    it('단일 아티스트는 정상적으로 파싱되어야 함', () => {
      const result = parseTJArtist('아이유');
      expect(result).toEqual({
        artist: ['아이유'],
        feature: [],
        producer: [],
      });
    });
  });

  describe('쉼표로 구분된 여러 아티스트', () => {
    it('쉼표로 구분된 여러 아티스트를 모두 추출해야 함', () => {
      const result = parseTJArtist('먼데이키즈,유회승,방예담,우디');
      expect(result).toEqual({
        artist: ['먼데이키즈', '유회승', '방예담', '우디'],
        feature: [],
        producer: [],
      });
    });

    it('5명의 아티스트를 모두 추출해야 함 (실제 예시)', () => {
      const result = parseTJArtist('먼데이키즈,DK(디셈버),유회승,방예담,우디');
      expect(result).toEqual({
        artist: ['먼데이키즈', 'DK(디셈버)', '유회승', '방예담', '우디'],
        feature: [],
        producer: [],
      });
    });
  });

  describe('괄호 안 별명/본명 포함', () => {
    it('괄호는 아티스트명에 포함되어야 함', () => {
      const result = parseTJArtist('빅나티(서동현),키드밀리');
      expect(result).toEqual({
        artist: ['빅나티(서동현)', '키드밀리'],
        feature: [],
        producer: [],
      });
    });

    it('여러 개의 괄호가 있어도 모두 유지되어야 함', () => {
      const result = parseTJArtist('DK(디셈버),BE\'O(비오)');
      expect(result).toEqual({
        artist: ['DK(디셈버)', 'BE\'O(비오)'],
        feature: [],
        producer: [],
      });
    });
  });

  describe('피처링 (Feat.) 처리', () => {
    it('단일 피처링 아티스트를 추출해야 함', () => {
      const result = parseTJArtist('여로(Feat.이효운)');
      expect(result).toEqual({
        artist: ['여로'],
        feature: ['이효운'],
        producer: [],
      });
    });

    it('피처링 안에 여러 아티스트가 있으면 모두 추출해야 함', () => {
      const result = parseTJArtist('아티스트(Feat.피처링1,피처링2,피처링3)');
      expect(result).toEqual({
        artist: ['아티스트'],
        feature: ['피처링1', '피처링2', '피처링3'],
        producer: [],
      });
    });

    it('별명 괄호와 피처링이 함께 있으면 정상적으로 파싱되어야 함', () => {
      const result = parseTJArtist('BE\'O(비오)(Feat.김필선)');
      expect(result).toEqual({
        artist: ['BE\'O(비오)'],
        feature: ['김필선'],
        producer: [],
      });
    });
  });

  describe('프로듀서 (Prod.) 처리', () => {
    it('단일 프로듀서를 추출해야 함', () => {
      const result = parseTJArtist('백아연(Prod.윤현상)');
      expect(result).toEqual({
        artist: ['백아연'],
        feature: [],
        producer: ['윤현상'],
      });
    });

    it('프로듀서 안에 여러 명이 있으면 모두 추출해야 함', () => {
      const result = parseTJArtist('아티스트(Prod.프로듀서1,프로듀서2)');
      expect(result).toEqual({
        artist: ['아티스트'],
        feature: [],
        producer: ['프로듀서1', '프로듀서2'],
      });
    });
  });

  describe('복합 케이스 (피처링 + 프로듀서)', () => {
    it('피처링과 프로듀서가 모두 있는 경우 정상적으로 파싱되어야 함', () => {
      const result = parseTJArtist('TimeFeveR(타임피버)(Feat.스카이민혁)(Prod.HOWOW)');
      expect(result).toEqual({
        artist: ['TimeFeveR(타임피버)'],
        feature: ['스카이민혁'],
        producer: ['HOWOW'],
      });
    });

    it('피처링과 프로듀서가 각각 여러 명인 경우 모두 추출되어야 함', () => {
      const result = parseTJArtist(
        '아티스트(Feat.피처링1,피처링2)(Prod.프로듀서1,프로듀서2)',
      );
      expect(result).toEqual({
        artist: ['아티스트'],
        feature: ['피처링1', '피처링2'],
        producer: ['프로듀서1', '프로듀서2'],
      });
    });

    it('여러 아티스트 중 일부만 피처링/프로듀서가 있는 경우', () => {
      const result = parseTJArtist('아티스트1,아티스트2(Feat.피처링1)');
      expect(result).toEqual({
        artist: ['아티스트1', '아티스트2'],
        feature: ['피처링1'],
        producer: [],
      });
    });
  });

  describe('대소문자 구분 없이 Feat./Prod. 인식', () => {
    it('소문자 feat.도 인식해야 함', () => {
      const result = parseTJArtist('아티스트(feat.피처링)');
      expect(result).toEqual({
        artist: ['아티스트'],
        feature: ['피처링'],
        producer: [],
      });
    });

    it('소문자 prod.도 인식해야 함', () => {
      const result = parseTJArtist('아티스트(prod.프로듀서)');
      expect(result).toEqual({
        artist: ['아티스트'],
        feature: [],
        producer: ['프로듀서'],
      });
    });

    it('대문자 FEAT./PROD.도 인식해야 함', () => {
      const result = parseTJArtist('아티스트(FEAT.피처링)(PROD.프로듀서)');
      expect(result).toEqual({
        artist: ['아티스트'],
        feature: ['피처링'],
        producer: ['프로듀서'],
      });
    });
  });

  describe('공백 처리', () => {
    it('쉼표 주변의 공백은 제거되어야 함', () => {
      const result = parseTJArtist('아티스트1 , 아티스트2 , 아티스트3');
      expect(result).toEqual({
        artist: ['아티스트1', '아티스트2', '아티스트3'],
        feature: [],
        producer: [],
      });
    });

    it('괄호 안의 공백도 처리되어야 함', () => {
      const result = parseTJArtist('아티스트(Feat. 피처링1 , 피처링2 )');
      expect(result).toEqual({
        artist: ['아티스트'],
        feature: ['피처링1', '피처링2'],
        producer: [],
      });
    });
  });

  describe('엣지 케이스', () => {
    it('쉼표만 있는 경우 빈 배열을 반환해야 함', () => {
      const result = parseTJArtist(',,,');
      expect(result).toEqual({
        artist: [],
        feature: [],
        producer: [],
      });
    });

    it('빈 괄호도 아티스트명에 포함되어야 함', () => {
      const result = parseTJArtist('아티스트()');
      expect(result).toEqual({
        artist: ['아티스트()'],
        feature: [],
        producer: [],
      });
    });

    it('여러 개의 피처링/프로듀서 괄호가 있는 경우 모두 추출되어야 함', () => {
      const result = parseTJArtist(
        '아티스트(Feat.피처링1)(Feat.피처링2)(Prod.프로듀서1)(Prod.프로듀서2)',
      );
      expect(result).toEqual({
        artist: ['아티스트'],
        feature: ['피처링1', '피처링2'],
        producer: ['프로듀서1', '프로듀서2'],
      });
    });

    it('피처링 안에 괄호가 있는 경우 정상적으로 파싱되어야 함', () => {
      const result = parseTJArtist('Miiro(미로),HoYoFair(Feat.Marochi(마로치))');
      expect(result).toEqual({
        artist: ['Miiro(미로)', 'HoYoFair'],
        feature: ['Marochi(마로치)'],
        producer: [],
      });
    });

    it('"외 X명" 패턴은 제거되어야 함', () => {
      const result = parseTJArtist('손태진,정진운,전태풍 외 6명');
      expect(result).toEqual({
        artist: ['손태진', '정진운', '전태풍'],
        feature: [],
        producer: [],
      });
    });

    it('피처링에 쉼표로 구분된 여러 명 (실제 예시)', () => {
      const result = parseTJArtist('Cillian(Feat.Hamel,박현진)');
      expect(result).toEqual({
        artist: ['Cillian'],
        feature: ['Hamel', '박현진'],
        producer: [],
      });
    });

    it('여러 아티스트 중 일부만 피처링 (실제 예시)', () => {
      const result = parseTJArtist('유민,RAZYBOYOCEAN(Feat.ASH ISLAND)');
      expect(result).toEqual({
        artist: ['유민', 'RAZYBOYOCEAN'],
        feature: ['ASH ISLAND'],
        producer: [],
      });
    });

    it('특수문자($)가 포함된 아티스트명', () => {
      const result = parseTJArtist('Ty Dolla $ign(Feat.Quavo,Juicy J)');
      expect(result).toEqual({
        artist: ['Ty Dolla $ign'],
        feature: ['Quavo', 'Juicy J'],
        producer: [],
      });
    });

    it('피처링에 "of" 패턴이 포함된 경우', () => {
      const result = parseTJArtist('도영(DOYOUNG)(Feat.벨 of KISS OF LIFE)');
      expect(result).toEqual({
        artist: ['도영(DOYOUNG)'],
        feature: ['벨 of KISS OF LIFE'],
        producer: [],
      });
    });
  });
});
