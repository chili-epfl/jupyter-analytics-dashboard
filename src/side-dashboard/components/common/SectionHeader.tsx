import React from 'react';

interface ISectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

const SectionHeader: React.FC<ISectionHeaderProps> = ({
  title,
  subtitle,
  icon
}) => {
  return (
    <div
      style={{
        marginTop: '24px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '2px solid var(--jp-border-color2)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: subtitle ? '4px' : '0'
        }}
      >
        {icon && <span style={{ fontSize: '20px' }}>{icon}</span>}
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--jp-ui-font-color0)',
            letterSpacing: '0.3px'
          }}
        >
          {title}
        </h3>
      </div>
      {subtitle && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: 'var(--jp-ui-font-color3)',
            fontStyle: 'italic'
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;
