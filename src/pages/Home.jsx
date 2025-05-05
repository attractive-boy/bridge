import React from 'react';
import NcViewer from '../components/NcViewer';

function Home() {
  return (
    <div style={{ padding: 24, height: 'calc(100vh - 48px)' }}>
      <NcViewer ncPath="models/test.nc" />
    </div>
  );
}

export default Home; 