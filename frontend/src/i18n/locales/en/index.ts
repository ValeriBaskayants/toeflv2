import { auth, navigation, dashboard, settings, features } from './common';
import { grammar }    from './grammar';
import { reading }    from './reading';
import { listening }  from './listening';
import { writing }    from './writing';
import { vocabulary } from './vocabulary';
import { mistakes }   from './mistakes';

export const en = {
  translation: {
    auth,
    navigation,
    dashboard,
    settings,
    features,
    grammar,
    reading,
    listening,
    writing,
    vocabulary,
    mistakes,
  },
} as const;
