/*
 * Copyright 2019 Red Hat, Inc. and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState } from 'react';
import { skillSelectors, skillOperations } from 'store/skill';
import { Skill } from 'domain/Skill';
import { TextInput, Text } from '@patternfly/react-core';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps, withRouter } from 'react-router';
import { usePagableData } from 'util/FunctionalComponentUtils';
import {
  DataTableUrlProps, RowEditButtons, RowViewButtons,
  setSorterInUrl, TableCell, TableRow, TheTable,
} from 'ui/components/DataTable';
import { tenantSelectors } from 'store/tenant';
import { stringSorter } from 'util/CommonSorters';
import { getPropsFromUrl } from 'util/BookmarkableUtils';
import { useValidators } from 'util/ValidationUtils';

export type Props = RouteComponentProps;


export const SkillRow = (skill: Skill) => {
  const [isEditing, setIsEditing] = useState(false);
  const dispatch = useDispatch();

  if (isEditing) {
    return (<EditableSkillRow skill={skill} isNew={false} onClose={() => setIsEditing(false)} />);
  }

  return (
    <TableRow>
      <TableCell>
        <Text>{skill.name}</Text>
      </TableCell>
      <RowViewButtons
        onEdit={() => setIsEditing(true)}
        onDelete={() => dispatch(skillOperations.removeSkill(skill))}
      />
    </TableRow>
  );
};

export const EditableSkillRow = (props: { skill: Skill; isNew: boolean; onClose: () => void }) => {
  const [name, setName] = useState(props.skill.name);
  const skillList = useSelector(skillSelectors.getSkillList);
  const dispatch = useDispatch();
  const validators = {
    nameMustNotBeEmpty: {
      predicate: (skill: Skill) => skill.name.length > 0,
      errorMsg: () => 'Skill cannot have an empty name',
    },
    nameAlreadyTaken: {
      predicate: (skill: Skill) => skillList.filter(otherSkill => otherSkill.name === skill.name
        && otherSkill.id !== skill.id).length === 0,
      errorMsg: (skill: Skill) => `Name (${skill.name}) is already taken by another skill`,
    },
  };

  const validationErrors = useValidators({
    ...props.skill,
    name,
  }, validators);

  return (
    <TableRow>
      <TableCell>
        <TextInput value={name} onChange={setName} />
        {validationErrors.showValidationErrors('nameMustNotBeEmpty', 'nameAlreadyTaken')}
      </TableCell>
      <RowEditButtons
        isValid={validationErrors.isValid}
        onSave={() => {
          if (props.isNew) {
            dispatch(skillOperations.addSkill({
              ...props.skill,
              name,
            }));
          } else {
            dispatch(skillOperations.updateSkill({
              ...props.skill,
              name,
            }));
          }
        }}
        onClose={() => props.onClose()}
      />
    </TableRow>
  );
};

export const SkillsPage: React.FC<Props> = (props) => {
  const skillList = useSelector(skillSelectors.getSkillList);
  const tenantId = useSelector(tenantSelectors.getTenantId);

  const { t } = useTranslation('SkillsPage');

  const columns = [
    { name: t('name'), sorter: stringSorter<Skill>(skill => skill.name) },
  ];

  const urlProps = getPropsFromUrl<DataTableUrlProps>(props, {
    page: '1',
    itemsPerPage: '10',
    filter: null,
    sortBy: '0',
    asc: 'true',
  });

  const sortBy = parseInt(urlProps.sortBy || '-1', 10);
  const { sorter } = columns[sortBy];

  const pagableData = usePagableData(urlProps, skillList, skill => [skill.name], sorter);

  return (
    <TheTable
      {...props}
      {...pagableData}
      title={t('skills')}
      columns={columns}
      rowWrapper={skill => (<SkillRow key={skill.id} {...skill} />)}
      sortByIndex={sortBy}
      onSorterChange={index => setSorterInUrl(props, urlProps, sortBy, index)}
      newRowWrapper={removeRow => (
        <EditableSkillRow
          isNew
          onClose={removeRow}
          skill={{
            tenantId,
            name: '',
          }}
        />
      )}
    />
  );
};

export default withRouter(SkillsPage);
