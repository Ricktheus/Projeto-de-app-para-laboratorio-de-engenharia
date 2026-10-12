import { BarlowSemiCondensed_600SemiBold } from '@expo-google-fonts/barlow-semi-condensed/600SemiBold';
import { BarlowSemiCondensed_700Bold } from '@expo-google-fonts/barlow-semi-condensed/700Bold';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { useFonts } from 'expo-font';

/**
 * Loads the brand fonts (OFL, bundled — plan §6.4). Only the six weights the
 * app uses are required, so the bundle does not carry the full families. The
 * UI renders immediately with system fonts and swaps in when loaded.
 */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    BarlowSemiCondensed_600SemiBold,
    BarlowSemiCondensed_700Bold,
    IBMPlexMono_500Medium,
  });
  return loaded;
}
