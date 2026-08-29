import { auth, navigation, dashboard, settings, features, skills, progress, roadmap, topicDetail } from './common';
import { grammar } from './grammar';
import { reading } from './reading';
import { listening } from './listening';
import { writing } from './writing';
import { vocabulary } from './vocabulary';
import { mistakes } from './mistakes';
import { quiz } from './quiz';
import { placement } from './placement';
import { exercises } from './exercises';
import { scramble } from './scramble';
import { speaking } from './speaking';

export const en = {
  translation: {
    auth,
    navigation,
    dashboard,
    settings,
    features,
    skills,
    progress,
    roadmap,
    topicDetail,
    scramble,
    grammar,
    reading,
    listening,
    writing,
    vocabulary,
    mistakes,
    quiz,
    placement,
    exercises,
    speaking,
  },
} as const;