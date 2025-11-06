// MessageModalTrigger.jsx
import React, { useState } from 'react';
import Modal from '../Modal';
import Button  from '@mui/material/Button';

const MessageModalTrigger = ({ message }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="contained"
        color="warning"
        className='px-1'
        sx={{ textTransform: 'none', fontSize: 12, padding: 0 }}
        onClick={() => setOpen(true)}
      >
        View Message
      </Button>

      <Modal
        isOpen={open}
        onRequestClose={() => setOpen(false)}
        title="Message"
      >
        <div style={{ padding: '1rem', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
          {message}
        </div>
      </Modal>
    </>
  );
};

export default MessageModalTrigger;
