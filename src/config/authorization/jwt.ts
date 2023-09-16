import { JwtModule } from '@nestjs/jwt';

export const JwtModuleRegister = () =>
	JwtModule.register({
		global: true,
		secret: jwtConstants.secret(),
		signOptions: { expiresIn: jwtConstants.expiresIn() },
	});

export const jwtConstants = {
	secret: () => process.env.JWT_SECRET_KEY,
	expiresIn: () => process.env.JWT_EXPIRES_IN,
};
