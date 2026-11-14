import { useState } from 'react';
import { Linking, View } from 'react-native';
import { APK_URL } from '../../config/site';
import type { UpdateStatus } from '../../infra/update/updateService';
import { strings } from '../../strings/pt-BR';
import { fill } from '../format';
import { Enter } from '../motion';
import { Text } from '../ui';
import { Button } from './Button';

/** Dismissible card on Home for an optional update. */
export function UpdateBanner({ status }: { status: UpdateStatus }) {
  const [hidden, setHidden] = useState(false);
  if (hidden || status.decision !== 'optional') return null;
  return (
    <Enter index={0} className="gap-2 rounded-3xl bg-folha p-4">
      <Text className="font-display-bold text-base text-tinta">{strings.update.title}</Text>
      <Text className="text-sm text-tinta/70">
        {fill(strings.update.body, { version: status.info.version })}
        {status.info.notes ? ` ${status.info.notes}` : ''}
      </Text>
      <View className="gap-1">
        <Button
          variant="sun"
          label={strings.update.action}
          onPress={() => void Linking.openURL(APK_URL)}
        />
        <Button variant="ghost" label={strings.update.later} onPress={() => setHidden(true)} />
      </View>
    </Enter>
  );
}
