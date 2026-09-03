import ReactDOM from 'react-dom/client';
import { InterviewOverlay } from '../../components/InterviewOverlay';
import './style.css';

export default defineContentScript({
  matches: ['https://neetcode.io/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'cue-interview-overlay',
      position: 'overlay',
      anchor: 'body',
      onMount(container) {
        const app = document.createElement('div');
        container.append(app);
        const root = ReactDOM.createRoot(app);
        root.render(<InterviewOverlay />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
