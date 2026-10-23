'use client';

import Link from 'next/link';
import { axionAppPath } from '../lib/in-process';
import type { ComponentProps } from 'react';

export default function WorkspaceLink({ href, ...props }: ComponentProps<typeof Link>) {
  const target = typeof href === 'string' ? axionAppPath(href)
    : { ...href, pathname: href.pathname ? axionAppPath(href.pathname) : href.pathname };
  return <Link href={target} {...props} />;
}
