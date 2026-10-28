import type { JSX } from 'react';
import { AppView } from '../views/app-view';
import { useAppController } from './use-app-controller';

export const AppPage = (): JSX.Element => <AppView {...useAppController()} />;
