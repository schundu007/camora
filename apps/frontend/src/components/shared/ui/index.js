/**
 * ============================================
 * SHARED UI COMPONENT LIBRARY
 * ============================================
 *
 * Enterprise-grade React components built with
 * Tailwind CSS and class-variance-authority.
 *
 * Usage:
 * import { Button, Card, Badge } from '../components/shared/ui';
 */

// Button components
export {
  Button,
  ButtonGroup,
  IconButton,
  buttonVariants,
} from './Button';

// Card components
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardDivider,
  CardImage,
  cardVariants,
} from './Card';

// Badge components
export {
  Badge,
  BadgeGroup,
  StatusBadge,
  CountBadge,
  badgeVariants,
} from './Badge';

// Input components
export {
  Input,
  Textarea,
  SearchInput,
  inputVariants,
} from './Input';

// Loading & Progress components
export {
  Spinner,
  DotsLoader,
  PulseLoader,
  Skeleton,
  LoadingOverlay,
  Progress,
  spinnerVariants,
} from './Spinner';

// Panel components
export {
  Panel,
  PanelHeader,
  PanelContent,
  PanelFooter,
  PanelSection,
  PanelDivider,
  PanelEmptyState,
  panelVariants,
} from './Panel';

// Utility
export { cn } from '../../../utils/cn';
