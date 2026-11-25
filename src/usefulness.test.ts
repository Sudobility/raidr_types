import { describe, expect, it } from 'vitest';
import {
  classifyToolUsefulness,
  usefulnessSchema,
  USEFULNESS_VALUES,
} from './usefulness.js';

const tool = (name: string, pathTemplate: string) => ({
  name,
  request: { pathTemplate },
});

describe('classifyToolUsefulness', () => {
  it('flags static file / data endpoints as asset', () => {
    expect(classifyToolUsefulness(tool('get_news', '/data/news.json'))).toBe(
      'asset'
    );
    expect(classifyToolUsefulness(tool('get_bundle', '/static/app.js'))).toBe(
      'asset'
    );
    expect(classifyToolUsefulness(tool('get_styles', '/assets/main.css'))).toBe(
      'asset'
    );
  });

  it('flags infrastructure as plumbing', () => {
    expect(classifyToolUsefulness(tool('submit_hit', '/api/collect'))).toBe(
      'plumbing'
    );
    expect(classifyToolUsefulness(tool('track_event', '/v1/track'))).toBe(
      'plumbing'
    );
    expect(
      classifyToolUsefulness(
        tool('create_challenge', '/cdn-cgi/challenge-platform/h/b')
      )
    ).toBe('plumbing');
    expect(
      classifyToolUsefulness(tool('get_feature_flags', '/api/flags'))
    ).toBe('plumbing');
    expect(classifyToolUsefulness(tool('get_ad_consent', '/api/consent'))).toBe(
      'plumbing'
    );
    expect(classifyToolUsefulness(tool('refresh_token', '/oauth/token'))).toBe(
      'plumbing'
    );
    expect(classifyToolUsefulness(tool('get_health', '/healthz'))).toBe(
      'plumbing'
    );
  });

  it('flags docs / localization as content', () => {
    expect(
      classifyToolUsefulness(
        tool('get_localization_ru', '/api/localization/ru')
      )
    ).toBe('content');
    expect(
      classifyToolUsefulness(
        tool('get_troubleshooting', '/docs/troubleshooting')
      )
    ).toBe('content');
  });

  it('defaults real actions and data to useful', () => {
    expect(
      classifyToolUsefulness(
        tool('list_marketplace_products', '/marketplace/products')
      )
    ).toBe('useful');
    expect(classifyToolUsefulness(tool('block_user', '/ajax/block_user'))).toBe(
      'useful'
    );
    expect(
      classifyToolUsefulness(tool('get_user_account', '/v2/user/accounts/'))
    ).toBe('useful');
    expect(classifyToolUsefulness(tool('create_order', '/v1/orders'))).toBe(
      'useful'
    );
    // user settings are a real action, not remote config
    expect(
      classifyToolUsefulness(tool('update_user_profile', '/v1/profile'))
    ).toBe('useful');
  });

  it('asset wins over plumbing (a .json config file is an asset)', () => {
    expect(classifyToolUsefulness(tool('get_config', '/config/app.json'))).toBe(
      'asset'
    );
  });

  it('tolerates missing fields', () => {
    expect(USEFULNESS_VALUES).toContain(classifyToolUsefulness({}));
    expect(usefulnessSchema.safeParse('useful').success).toBe(true);
    expect(usefulnessSchema.safeParse('nope').success).toBe(false);
  });
});
