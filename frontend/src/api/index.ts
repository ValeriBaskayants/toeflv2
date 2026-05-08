// Core axios instance (also needed occasionally for direct use in hooks/thunks)
export { api } from './client';

// Domain APIs — import from here, never from the individual modules directly
export { authApi } from './services/auth';

// Future domains — uncomment as you build them:
// export { testsApi }    from './tests';
// export { resultsApi }  from './results';
// export { usersApi }    from './users';