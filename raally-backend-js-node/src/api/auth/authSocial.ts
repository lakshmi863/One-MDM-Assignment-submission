import passport from 'passport';
import AuthService from '../../services/auth/authService';
import GoogleStrategy from 'passport-google-oauth20';
import FacebookStrategy from 'passport-facebook';
import ApiResponseHandler from '../apiResponseHandler';
import { databaseInit } from '../../database/databaseConnection';
import { get } from 'lodash';

export default (app, routes) => {
  app.use(passport.initialize());

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  routes.post('/auth/social/onboard', async (req, res) => {
    try {
      const payload = await AuthService.handleOnboard(
        req.currentUser,
        req.body.invitationToken,
        req.body.tenantId,
        req
      );
      await ApiResponseHandler.success(req, res, payload);
    } catch (error) {
      await ApiResponseHandler.error(req, res, error);
    }
  });

  // Google Strategy
  if (process.env.AUTH_SOCIAL_GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy({
      clientID: process.env.AUTH_SOCIAL_GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_SOCIAL_GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.AUTH_SOCIAL_GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const database = await databaseInit();
        const email = get(profile, 'emails[0].value');
        const emailVerified = get(profile, 'emails[0].verified', false);
        const displayName = get(profile, 'displayName');
        const { firstName, lastName } = splitFullName(displayName);
        
        const jwtToken = await AuthService.signinFromSocial(
          'google',
          profile.id,
          email,
          emailVerified,
          firstName,
          lastName,
          { database }
        );
        done(null, jwtToken);
      } catch (error) {
        console.error(error);
        done(error, null);
      }
    }));

    routes.get('/auth/social/google', passport.authenticate('google', {
      scope: ['email', 'profile'],
      session: false,
    }));

    routes.get('/auth/social/google/callback', (req, res, next) => {
      passport.authenticate('google', (err, jwtToken) => {
        handleCallback(res, err, jwtToken);
      })(req, res, next);
    });
  }

  // Facebook Strategy
  if (process.env.AUTH_SOCIAL_FACEBOOK_CLIENT_ID) {
    passport.use(new FacebookStrategy({
      clientID: process.env.AUTH_SOCIAL_FACEBOOK_CLIENT_ID,
      clientSecret: process.env.AUTH_SOCIAL_FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.AUTH_SOCIAL_FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'email', 'displayName'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const database = await databaseInit();
        const email = get(profile, 'emails[0].value');
        const emailVerified = true;
        const displayName = get(profile, 'displayName');
        const { firstName, lastName } = splitFullName(displayName);
        
        const jwtToken = await AuthService.signinFromSocial(
          'facebook',
          profile.id,
          email,
          emailVerified,
          firstName,
          lastName,
          { database }
        );
        done(null, jwtToken);
      } catch (error) {
        console.error(error);
        done(error, null);
      }
    }));

    routes.get('/auth/social/facebook', passport.authenticate('facebook', {
      session: false,
    }));

    routes.get('/auth/social/facebook/callback', (req, res, next) => {
      passport.authenticate('facebook', (err, jwtToken) => {
        handleCallback(res, err, jwtToken);
      })(req, res, next);
    });
  }
};

function handleCallback(res, err, jwtToken) {
  if (err) {
    console.error(err);
    const errorCode = ['auth-invalid-provider', 'auth-no-email'].includes(err.message)
      ? err.message
      : 'generic';

    res.redirect(`${process.env.FRONTEND_URL}/auth/signin?socialErrorCode=${errorCode}`);
    return;
  }

  res.redirect(`${process.env.FRONTEND_URL}/?social=true&authToken=${jwtToken}`);
}

function splitFullName(fullName) {
  if (!fullName) return { firstName: null, lastName: null };

  const names = fullName.split(' ');
  const firstName = names.shift();
  const lastName = names.join(' ');

  return { firstName, lastName };
}
