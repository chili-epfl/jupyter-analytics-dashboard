import React from 'react';

export interface IGroupInfo {
  name: string;
  studentCount: number;
}

interface IGroupFilterProps {
  groups: IGroupInfo[];
  selectedGroups: string[];
  onGroupsChange: (selectedGroups: string[]) => void;
  multiSelect?: boolean;
}

const GroupFilter: React.FC<IGroupFilterProps> = ({
  groups,
  selectedGroups,
  onGroupsChange,
  multiSelect = true
}) => {
  const handleGroupToggle = (groupName: string) => {
    if (multiSelect) {
      if (selectedGroups.includes(groupName)) {
        onGroupsChange(selectedGroups.filter(g => g !== groupName));
      } else {
        onGroupsChange([...selectedGroups, groupName]);
      }
    } else {
      onGroupsChange([groupName]);
    }
  };

  const handleSelectAll = () => {
    if (selectedGroups.length === groups.length) {
      onGroupsChange([]);
    } else {
      onGroupsChange(groups.map(g => g.name));
    }
  };

  const isAllSelected = selectedGroups.length === groups.length;

  return (
    <div
      style={{
        backgroundColor: 'var(--jp-layout-color2)',
        border: '1px solid var(--jp-border-color1)',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '16px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}
      >
        <label
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--jp-ui-font-color1)'
          }}
        >
          Filter by Group
        </label>
        {multiSelect && groups.length > 0 && (
          <button
            onClick={handleSelectAll}
            style={{
              fontSize: '11px',
              color: 'var(--jp-brand-color1)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              textDecoration: 'underline'
            }}
          >
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--jp-ui-font-color3)',
            fontStyle: 'italic',
            padding: '8px 0'
          }}
        >
          No groups available
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {groups.map(group => {
            const isSelected = selectedGroups.includes(group.name);
            return (
              <label
                key={group.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  backgroundColor: isSelected
                    ? 'var(--jp-layout-color3)'
                    : 'transparent',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  fontSize: '12px'
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor =
                      'var(--jp-layout-color1)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleGroupToggle(group.name)}
                  style={{
                    cursor: 'pointer',
                    margin: 0
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    color: 'var(--jp-ui-font-color1)'
                  }}
                >
                  {group.name}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--jp-ui-font-color3)',
                    backgroundColor: 'var(--jp-layout-color1)',
                    padding: '2px 6px',
                    borderRadius: '10px'
                  }}
                >
                  {group.studentCount}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GroupFilter;
