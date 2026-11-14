import { Redirect } from 'expo-router';

/** `unscroll://reset` lands here; the Shell consumes the link itself, so just go home. */
export default function ResetRoute() {
  return <Redirect href="/" />;
}
