import { auth, navigation, dashboard, settings, features } from './common';
import { grammar }    from './grammar';
import { reading }    from './reading';
import { listening }  from './listening';
import { writing }    from './writing';
import { vocabulary } from './vocabulary';
import { mistakes }   from './mistakes';
import { quiz }       from './quiz';
import { placement }  from './placement';
import { exercises }  from './exercises';
import { scramble }   from './scramble'; 

export const ru = {
  translation: {
    auth,
    navigation,
    dashboard,
    settings,
    features,
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
  },
} as const;