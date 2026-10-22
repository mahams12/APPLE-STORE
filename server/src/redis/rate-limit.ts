import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { RedisService } from "./redis.service";

type LimitRule = { max: number; windowSeconds: number };

const RULES: Record<string, LimitRule> = {
  login: { max: 20, windowSeconds: 60 },
  register: { max: 10, windowSeconds: 60 },
  "password-reset": { max: 5, windowSeconds: 60 },
  search: { max: 60, windowSeconds: 60 },
  checkout: { max: 15, windowSeconds: 60 },
  "payment-create": { max: 15, windowSeconds: 60 },
  "payment-webhook": { max: 120, windowSeconds: 60 },
  "admin-auth": { max: 15, windowSeconds: 60 },
};

@Injectable()
export class RateLimitService {
  private readonly redis: RedisService;

  constructor(@Inject(RedisService) redis: RedisService) {
    this.redis = redis;
  }

  async check(bucket: keyof typeof RULES | string, identity: string) {
    const rule = RULES[bucket] || { max: 30, windowSeconds: 60 };
    const key = `rl:${bucket}:${identity}`;
    const count = await this.redis.incr(key, rule.windowSeconds);
    if (count > rule.max) {
      throw new BadRequestException("Too many attempts. Wait a minute and try again.");
    }
  }
}
