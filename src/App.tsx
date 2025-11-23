import { createSignal, type Component } from 'solid-js';
import { LambdaTree } from './lambda-tree';
// import { makePersisted } from '@solid-primitives';
import './App.css'; // Import the new styles
import { makePersisted } from '@solid-primitives/storage';

const App: Component = () => {
  // Initialize with a signal
  const [lambda, setLambda] = makePersisted(createSignal("(\\x. x) y"), {
    name: "lambda-expression"
  });

  return (
    <div class="app-container">
      <div class="input-group">
        <label class="lambda-label">Lambda Expression</label>
        <input
          class="lambda-input"
          type="text"
          value={lambda()} // Important: Bind value to state so persistence works visually
          onInput={(e) => setLambda(e.currentTarget.value)}
          placeholder="e.g. \x. \y. x y"
          spellcheck={false} // Disable red squigglies for code
          autocomplete="off"
        />
      </div>

      {/* The Visualizer */}
      <LambdaTree lambda={lambda} />
    </div>
  );
};

export default App;