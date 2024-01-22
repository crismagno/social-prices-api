import { JwtModule } from '@nestjs/jwt';

export const JwtModuleRegister = () =>
	JwtModule.register({
		global: true,
		secret: AuthorizationTokenJwtConstants.secret(),
		signOptions: { expiresIn: AuthorizationTokenJwtConstants.expiresIn() },
	});

export const AuthorizationTokenJwtConstants = {
	secret: () => process.env.JWT_SECRET_KEY,
	expiresIn: () => process.env.JWT_EXPIRES_IN,
};
