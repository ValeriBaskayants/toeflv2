import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            clientID: configService.get<string>('google.clientId'),
            clientSecret: configService.get<string>('google.clientSecret'),
            callbackURL: configService.get<string>('google.callbackUrl'),
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
    ): Promise<any> {
        const { id, displayName, emails, photos } = profile;

        const email = emails?.[0]?.value;

        if (!email) {
            throw new Error('No email provided by Google');
        }

        const googleUser = {
            googleId: id,
            email: email, 
            name: displayName,
            avatar: photos?.[0]?.value,
        };

        return await this.usersService.findOrCreateGoogleUser(googleUser);
    }
}