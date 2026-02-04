import React from 'react';

interface ISummaryCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: number;
    positive: boolean;
    description: string;
  };
  color?: string;
}

interface IDashboardSummaryCardsProps {
  cards: ISummaryCard[];
}

const DashboardSummaryCards: React.FC<IDashboardSummaryCardsProps> = ({
  cards
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
        padding: '12px'
      }}
    >
      {cards.map((card, index) => (
        <div
          key={index}
          style={{
            backgroundColor: 'var(--jp-layout-color2)',
            border: '1px solid var(--jp-border-color1)',
            borderRadius: '8px',
            padding: '16px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Accent bar */}
          {card.color && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                backgroundColor: card.color
              }}
            />
          )}

          {/* Icon */}
          {card.icon && (
            <div
              style={{
                fontSize: '24px',
                marginBottom: '8px',
                opacity: 0.8
              }}
            >
              {card.icon}
            </div>
          )}

          {/* Title */}
          <div
            style={{
              fontSize: '11px',
              color: 'var(--jp-ui-font-color2)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
              fontWeight: 500
            }}
          >
            {card.title}
          </div>

          {/* Value */}
          <div
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: 'var(--jp-ui-font-color0)',
              marginBottom: '4px',
              lineHeight: 1
            }}
          >
            {card.value}
          </div>

          {/* Subtitle */}
          {card.subtitle && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--jp-ui-font-color2)',
                marginBottom: '8px'
              }}
            >
              {card.subtitle}
            </div>
          )}

          {/* Trend indicator */}
          {card.trend && (
            <div
              style={{
                fontSize: '11px',
                color: card.trend.positive ? '#4caf50' : '#f44336',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '8px'
              }}
            >
              <span>{card.trend.positive ? '▲' : '▼'}</span>
              <span>{Math.abs(card.trend.value)}</span>
              <span style={{ color: 'var(--jp-ui-font-color3)' }}>
                {card.trend.description}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DashboardSummaryCards;
