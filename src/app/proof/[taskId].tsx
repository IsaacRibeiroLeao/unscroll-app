import { useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '../../presentation/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage, proofMessage } from '../../application/errorMessages';
import { submitTaskProof } from '../../application/submitTaskProof';
import { Button } from '../../presentation/components/Button';
import { useAppStore } from '../../presentation/state/appStore';
import { backend, blocker, discardPhoto, errorTexts } from '../../presentation/state/container';
import { keys } from '../../presentation/state/queries';
import { strings } from '../../strings/pt-BR';

export default function ProofScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const setLastProof = useAppStore((s) => s.setLastProof);
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const capture = async () => {
    if (busy || !taskId) return;
    setBusy(true);
    setMessage(null);
    let uri: string | null = null;
    try {
      const picture = await camera.current?.takePictureAsync({ quality: 0.7 });
      if (!picture) return;
      uri = picture.uri;
      const { outcome, blockerError } = await submitTaskProof({
        backend,
        blocker,
        taskId,
        photoUri: uri,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.profile }),
        qc.invalidateQueries({ queryKey: keys.tasks }),
      ]);
      if (outcome.approved && outcome.rewards) {
        setLastProof({ outcome, blockerFailed: blockerError !== null });
        router.replace('/celebration');
      } else if (outcome.code !== 'APPROVED') {
        setMessage(proofMessage(outcome.code, outcome.feedback, errorTexts));
      }
    } catch (e) {
      setMessage(errorMessage(e, errorTexts));
    } finally {
      if (uri) discardPhoto(uri);
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-3 bg-nevoa px-8">
        <Text className="text-xl font-display-bold text-tinta">
          {strings.proof.permissionTitle}
        </Text>
        <Text className="mb-2 text-center text-tinta/70">{strings.proof.permissionBody}</Text>
        <Button label={strings.proof.grant} onPress={() => void requestPermission()} />
        <Button label={strings.common.close} variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={camera} facing="back" style={{ flex: 1 }} />
      <SafeAreaView className="absolute inset-0 justify-between p-4" pointerEvents="box-none">
        <Text className="self-center rounded-full bg-black/60 px-4 py-2 text-center text-sm text-white">
          {strings.proof.instruction}
        </Text>
        <View className="gap-3">
          {message ? (
            <Text
              accessibilityRole="alert"
              className="rounded-2xl bg-folha p-3 text-center text-sm text-tinta"
            >
              {message}
            </Text>
          ) : null}
          {busy ? (
            <View className="items-center gap-2">
              <ActivityIndicator color="#fff" />
              <Text className="text-sm text-white">{strings.proof.sending}</Text>
            </View>
          ) : (
            <Button
              label={message ? strings.proof.tryAgain : strings.proof.capture}
              onPress={() => void capture()}
            />
          )}
          <Button label={strings.common.close} variant="ghost" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    </View>
  );
}
