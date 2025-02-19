import React, { useEffect, useState } from 'react';
import { Dropdown, Form } from 'react-bootstrap';
import { PeopleFill as GroupLogo } from 'react-bootstrap-icons';
import { fetchWithCredentials } from '../../../utils/utils';
import { AppDispatch, RootState, store } from '../../../redux/store';
import { setDashboardQueryArgsSelectedGroups } from '../../../redux/reducers/CommonDashboardReducer';
import { useSelector } from 'react-redux';
import { BACKEND_API_URL } from '../../..';
import { InteractionRecorder } from '../../../utils/interactionRecorder';

const dispatch = store.dispatch as AppDispatch;

interface IGroupState {
  includeAllChecked: boolean;
  groupList: { name: string; checked: boolean }[];
}

const GroupDropDown = (props: { notebookId: string }): JSX.Element => {
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedGroupNamesRedux: string[] | undefined = useSelector(
    (state: RootState) =>
      state.commondashboard.dashboardQueryArgs.selectedGroups[props.notebookId]
  );

  const [groupListState, setGroupListState] = useState<IGroupState>({
    // if no group name is already selected, check the include-all checkbox
    includeAllChecked:
      selectedGroupNamesRedux === undefined ||
      selectedGroupNamesRedux.length === 0,
    groupList: []
  });

  // useEffect that runs whenever the selected groups change to trigger a refetch
  useEffect(() => {
    // to not trigger before the groups have been fetched on a temporary empty group list
    if (areGroupsFetched) {
      let checkedGroups: string[];
      if (groupListState.includeAllChecked) {
        checkedGroups = [];
      } else {
        checkedGroups = groupListState.groupList
          .filter(group => group.checked === true)
          .map(group => group.name);
      }
      dispatch(
        setDashboardQueryArgsSelectedGroups({
          notebookId: props.notebookId,
          groups: checkedGroups
        })
      );
    }
  }, [groupListState]);

  const [areGroupsFetched, setAreGroupsFetched] = useState(false);

  // fetch the group names
  useEffect(() => {
    setAreGroupsFetched(false);
    fetchWithCredentials(
      `${BACKEND_API_URL}/dashboard/${props.notebookId}/getgroups`
    )
      .then(response => response.json())
      .then((data: string[]) => {
        const updatedGroupList = data
          .map(name => ({
            name,
            checked: selectedGroupNamesRedux?.includes(name) // check if name exists in selectedGroupNames
          }))
          .sort((a, b) => {
            if (a.checked !== b.checked) {
              return b.checked ? 1 : -1; // checked items first
            }

            // if checked status is the same, sort alphabetically by name
            return a.name.localeCompare(b.name);
          }); // sort checked groups first
        setGroupListState(prevState => {
          return {
            ...prevState,
            groupList: updatedGroupList
          };
        });
        setAreGroupsFetched(true);
      });
  }, [props.notebookId]);

  const handleToggleIncludeAll = (checked: boolean) => {
    setGroupListState(prevState => {
      const newGroupList = prevState.groupList.map(group => ({
        ...group,
        checked: false // uncheck all groups when includeAll is checked
      }));

      return {
        ...prevState,
        includeAllChecked: checked,
        groupList: checked ? newGroupList : prevState.groupList // only update groupList if checked is true
      };
    });
  };

  const handleToggleGroup = (index: number) => {
    setGroupListState(prevState => {
      // create a copy of the previous group list array
      const newGroupList = [...prevState.groupList];

      // toggle the checked value of the group at the specified index
      newGroupList[index] = {
        ...newGroupList[index],
        checked: !newGroupList[index].checked
      };

      return {
        ...prevState,
        groupList: newGroupList
      };
    });
  };

  const resetOpeningStates = () => {
    setGroupListState(prevState => {
      const checked =
        selectedGroupNamesRedux === undefined ||
        selectedGroupNamesRedux.length === 0;
      const updatedGroupList = prevState.groupList
        .map((value: { name: string; checked: boolean }) => ({
          name: value.name,
          checked: selectedGroupNamesRedux?.includes(value.name) // check if name exists in selectedGroupNames
        }))
        .sort((a, b) => {
          if (a.checked !== b.checked) {
            return b.checked ? 1 : -1; // checked items first
          }

          // if checked status is the same, sort alphabetically by name
          return a.name.localeCompare(b.name);
        });

      return {
        ...prevState,
        includeAllChecked: checked, // check the includeAll checkbox in case there's no selected group
        groupList: updatedGroupList
      };
    });
  };

  const toggleMenu = () => {
    InteractionRecorder.sendInteraction({
      click_type: showDropdown ? 'OFF' : 'ON',
      signal_origin: 'DASHBOARD_FILTER_GROUPS'
    });
    if (!showDropdown) {
      // opening the dropdown with the correct states
      resetOpeningStates();
    }
    setShowDropdown(!showDropdown);
  };

  return (
    <Dropdown
      id="group-dropdown"
      className="custom-dropdown"
      show={showDropdown}
      onToggle={toggleMenu}
    >
      <Dropdown.Toggle className="dashboard-button">
        {groupListState.groupList.some(
          (group: any) => group.checked === true
        ) && ( // if not default value, display a red dot to notify the user
          <span className="dashboard-filter-red-dot" />
        )}
        <GroupLogo className="dashboard-icon" />
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Header>Filter by group of users</Dropdown.Header>
        <Dropdown.Divider />

        <div className="custom-dropdown-container custom-dropdown-item">
          <Form.Check
            id="group-checkbox-include-all"
            type="checkbox"
            label="Include all users"
            checked={groupListState.includeAllChecked}
            onChange={e => handleToggleIncludeAll(e.target.checked)}
          />
        </div>

        <Dropdown.Divider />

        <div
          className={`group-dropdown-scroll ${groupListState.includeAllChecked ? 'disabled' : ''}`}
        >
          {groupListState.groupList.length > 0 ? (
            groupListState.groupList.map((value, index) => (
              <div
                className={`custom-dropdown-item ${groupListState.includeAllChecked ? 'disabled' : ''}`}
              >
                <Form.Check
                  id={`group-checkbox-${index}`}
                  type="checkbox"
                  disabled={groupListState.includeAllChecked ? true : undefined}
                  label={value.name}
                  title={value.name}
                  checked={value.checked}
                  onChange={() => handleToggleGroup(index)}
                />
              </div>
            ))
          ) : (
            <Dropdown.Item disabled>No groups available</Dropdown.Item>
          )}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default GroupDropDown;
