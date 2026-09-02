export const speaking = {
  hub: {
    title: 'Khosq',
    subtitle: 'Vardzvir khosqi arjaner nman iranakan TOEFL testin',
    types: {
      listenAndRepeat: {
        name: 'Lsel ev krknel',
        desc: 'Lsir naxadasutyuny mek ankam ev krkni ayn chshgrtoren',
      },
    },
  },
  listenRepeat: {
    title: 'Lsel ev krknel',
    subtitle: 'Ěntrir cank ev vardzvir iranakan testi patrastvatsutyamb',
    loading: 'Ěntranq bernvum en...',
    items: 'arataxosq',
    start: 'Skskel varjanqy',
    filters: {
      level: 'Makardak',
    },
    empty: {
      title: 'Ěntranq chkan',
      hint: 'Poxel makardaky',
    },
  },
  session: {
    exitConfirm: 'Vstahv es, uzum es elk? Ays sesian arajedimutyun kkorci.',
    idle: {
      title: 'Patrasty?',
      hint: 'Du klses yurakanchyur naxadasutyuny mek ankam, ev kkrknes karchat dzayn hnchelu hetevanqov. Havastia mikrofoni michocnery mianalu masin.',
      begin: 'Skskel',
    },
    requestingMic: 'Xndrvum e mikrofoni michocutyun...',
    getReady: 'Patrastvir...',
    loadingAudio: 'Bervum e dzayny...',
    listen: 'Lsir dzhgrtoren',
    getReadyToSpeak: 'Patrastvir khosel',
    speakNow: 'Xosir hima',
    processing: 'Mshakvum e qo pataskhany...',
    recorded: 'Grancvats e',
    finishing: 'Hashvark votvum e...',
    retry: 'Poxordzel krknel',
    errors: {
      microphone_denied: 'Ays arajedi hamar petq e mikrofoni michocutyun',
      audio_load_failed: 'Chhajoghvets bernel dzayny. Poxordzek krknel',
      audio_playback_failed: 'Dzayni herustacman skhal. Poxordzek krknel',
      submit_failed: 'Chhajoghvets ugharkel pataskhany. Poxordzek krknel',
      finish_failed: 'Chhajoghvets amnhoxel arjeqery. Poxordzek krknel',
      quota_exceeded: 'Amsakan xosqi gnahatman sahmany sparvel e. Ayn kthorinvi hajord amsi 1-in',
    },
    review: {
      title: 'Sesian avartvel e',
      taskScore: 'arjeqi kshiq',
      overall: 'endhanur',
      backToList: 'Het depi cankery',
    },
  },
  repeat: {
  title: 'Խոսք — Listen and Repeat',
  subtitle: 'Կրկնեք նախադասությունները ճիշտ այնպես, ինչպես իրական TOEFL-ում',
  loading: 'Բեռնվում է…',
  error: 'Ինչ-որ բան այն չէ',
  retry: 'Կրկին փորձել',
  backToList: 'Վերադառնալ ցանկին',
  itemCount: '{{count}} նախադասություն',
  itemOf: 'Նախադասություն {{current}} / {{total}}',
  bestScore: 'Լավագույն արդյունք՝ {{score}}%',

  filters: { allScenarios: 'Բոլոր սցենարները', allLevels: 'Բոլոր մակարդակները' },
  empty: { title: 'Առաջադրանքներ չեն գտնվել', hint: 'Փորձեք այլ մակարդակ կամ սցենար' },

  status: { completed: 'Ավարտված', inProgress: 'Ընթացքի մեջ', notStarted: 'Դեռ չսկսված' },

  intro: {
    title: 'Մինչ սկսելը',
    rule1: 'Դուք կլսեք {{count}} նախադասություն՝ մեկը մյուսի հետևից։',
    rule2: 'Յուրաքանչյուր նախադասություն հնչում է միայն մեկ անգամ։',
    rule3: 'Կարճ դադարից և ազդանշանից հետո կրկնեք այն, ինչ լսեցիք։',
    rule4: 'Ձայնագրումը սկսվում է ինքնաբերաբար և ավարտվում է սահմանված ժամանակից հետո։',
    start: 'Սկսել',
    starting: 'Մեկնարկում է…',
  },

  mic: {
    requesting: 'Հայցվում է մուտք դեպի խոսափող…',
    deniedTitle: 'Անհրաժեշտ է մուտք դեպի խոսափող',
    reasons: {
      permission_denied: 'Թույլատրեք խոսափողի մուտքը բրաուզերի կարգավորումներում և թարմացրեք էջը։',
      no_microphone: 'Այս սարքում խոսափող չի հայտնաբերվել։',
      device_busy: 'Խոսափողն արդեն օգտագործվում է այլ ծրագրի կողմից։',
      unknown: 'Չհաջողվեց մուտք գործել խոսափող։ Ստուգեք սարքի կարգավորումները։',
    },
  },

  unsupported: 'Ձեր բրաուզերը չի աջակցում աudio ձայնագրում։ Օգտագործեք Chrome, Edge, Firefox կամ Safari։',
  audioError: 'Չհաջողվեց բեռնել այս նախադասության ձայնը։',
  listen: 'Լսեք ուշադիր…',
  getReady: 'Պատրաստվեք…',
  speakNow: 'Խոսեք',
  recording: 'Ձայնագրվում է',
  submitting: 'Պահպանվում է ձեր պատասխանը…',
  finishing: 'Հաշվարկվում է արդյունքը…',

  submitFailed: {
    title: 'Ինչ-որ բան այն չէ',
    hint: 'Չհաջողվեց պահպանել պատասխանը մի քանի փորձից հետո։ Սկսենք առաջադրանքը նորից։',
    restart: 'Սկսել նորից',
  },

  results: {
    taskScore: 'Առաջադրանքի միավոր՝ {{score}} / 5',
    xpEarned: 'Ստացված XP',
    itemsCompleted: 'Ավարտված նախադասություններ',
    youSaid: 'Դուք ասացիք',
    playYourAnswer: 'Լսել ձեր պատասխանը',
    practiceAgain: 'Կրկին փորձել',
  },
},
};