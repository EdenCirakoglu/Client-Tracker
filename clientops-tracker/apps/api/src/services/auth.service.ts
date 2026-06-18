import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { findUserWithPasswordByEmail } from './user.service';
import { ApiError } from '../utils/http';

export async function loginWithPassword(email: string, password: string) {
  const user = await findUserWithPasswordByEmail(email);

  if (!user) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;
  const token = jwt.sign({ role: safeUser.role }, env.JWT_SECRET, {
    subject: safeUser.id,
    expiresIn: '1d',
  });

  return {
    token,
    user: safeUser,
  };
}
