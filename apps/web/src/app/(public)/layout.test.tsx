import { render } from '@testing-library/react';
import PublicLayout from './layout';

describe('PublicLayout', () => {
  it('renders children', () => {
    const { getByText } = render(
      <PublicLayout>
        <div>Test Content</div>
      </PublicLayout>
    );
    expect(getByText('Test Content')).toBeInTheDocument();
  });
});
