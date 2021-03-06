import React, { useState, useEffect, useRef } from 'react';

import * as pfReactTable from '@patternfly/react-table';
import * as reactRouterDom from 'react-router-dom';
import * as ReactRedux from 'react-redux';
import { reactCore } from '@redhat-cloud-services/frontend-components-utilities/files/inventoryDependencies';
import { useStore } from 'react-redux';
import orderBy from 'lodash/orderBy';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';

import PropTypes from 'prop-types';
import {
    Modal, ToolbarItem, ToolbarGroup
} from '@patternfly/react-core';
import { getRegistry } from '@redhat-cloud-services/frontend-components-utilities/files/Registry';
import { TableToolbar, ConditionalFilter, conditionalFilterType } from '@redhat-cloud-services/frontend-components';
import { inventoryUrlBuilder } from '../../Utilities/urls';
import reducers from '../../store/reducers';
import RemediationDetailsSystemDropdown from '../RemediationDetailsSystemDropdown';
import ConfirmationDialog from '../ConfirmationDialog';
import { getSystemName } from '../../Utilities/model';
import { IconInline } from '../Layouts/IconInline';

export const SystemsStatusModal = ({
    isOpen,
    onClose,
    issue,
    remediation,
    onDelete }) => {

    const [ deleteDialogOpen, setDeleteDialogOpen ] = useState(false);
    const [ InventoryTable, setInventoryTable ] = useState();
    const [ system, setSystem ] = useState({});
    const [ systemStatuses, setSystemStatuses ] = useState({});
    const [ page, setPage ] = useState(1);
    const [ pageSize, setPageSize ] = useState(50);
    const [ filterText, setFilterText ] = useState('');
    const inventory = useRef(null);
    const store = useStore();

    useEffect(() => {
        const statuses = {};
        issue.systems.map(system => {
            statuses[system.id] = system.resolved === true
                ? <IconInline icon={ <CheckIcon/> } text='Remediated'/>
                : <IconInline icon={ <TimesIcon/> } text='Not remediated'/>;
        });
        setSystemStatuses(statuses);
    }, []);

    // eslint-disable-next-line react/display-name
    const detailDropdown = (remediation, issue) => (system) => (
        <RemediationDetailsSystemDropdown remediation={ remediation } issue={ issue } system={ system } />
    );

    const urlBuilder = inventoryUrlBuilder(issue);

    const generateStatus = (id) => {
        return (
            systemStatuses[id]
        );
    };

    const loadInventory = async () => {
        const {
            inventoryConnector,
            mergeWithEntities,
            INVENTORY_ACTION_TYPES
        } = await insights.loadInventory({
            ReactRedux,
            react: React,
            reactRouterDom,
            pfReactTable,
            pfReact: reactCore
        });

        getRegistry().register({
            ...mergeWithEntities(reducers.inventoryEntitiesReducer({
                INVENTORY_ACTION_TYPES,
                detailDropdown: detailDropdown(remediation, issue),
                urlBuilder,
                generateStatus
            })())
        });

        const { InventoryTable } = inventoryConnector(store);
        setInventoryTable(() => InventoryTable);
    };

    useEffect(() => {
        if (isOpen && inventory && !inventory.current) {
            loadInventory();
        }

    }, [ isOpen ]);

    const onRefresh = (options) => {
        if (inventory && inventory.current) {
            setPage(options.page);
            setPageSize(options.per_page);
            inventory.current.onRefreshData(options);
        }
    };

    // const activeFiltersConfig = {
    //     filters: filterText.length ? [{ category: 'Action', chips: [{ name: filterText }]}] : [],
    //     onDelete: () => {setFilterText('')}
    // };

    return (
        <React.Fragment>
            <Modal
                className="ins-c-dialog"
                width={ '50%' }
                title={ `System${issue.systems.length > 1 ? 's' : ''} for action ${issue.description}` }
                isOpen={ isOpen }
                onClose={ onClose }
                isFooterLeftAligned
            >
                <div className="ins-c-toolbar__filter">
                    { InventoryTable && <InventoryTable
                        ref={ inventory }
                        items={ orderBy(issue.systems.filter(s => getSystemName(s).includes(filterText)), [ s => getSystemName(s), s => s.id ]) }
                        onRefresh={ onRefresh }
                        page={ page }
                        total={ issue.systems.length }
                        perPage={ pageSize }
                        hasCheckbox={ false }
                        actions= { [
                            {
                                title: ' Remove system',
                                onClick: (event, rowId, rowData) => {
                                    setSystem(rowData);
                                    setDeleteDialogOpen(true);
                                }
                            }] }
                    >
                        <TableToolbar>
                            <ToolbarGroup>
                                <ToolbarItem>
                                    <ConditionalFilter
                                        items={ [
                                            {
                                                value: 'display_name',
                                                label: 'Name',
                                                filterValues: {
                                                    placeholder: 'Search by name', type: conditionalFilterType.text,
                                                    value: filterText,
                                                    onChange: (e, selected) => setFilterText(selected)
                                                }
                                            }
                                        ] }
                                    />
                                </ToolbarItem>
                            </ToolbarGroup>
                        </TableToolbar>
                        { /* <PrimaryToolbar
                            filterConfig={ {
                                items: [
                                    {
                                        label: 'Name',
                                        type: 'text',
                                        filterValues: {
                                            id: 'filter-by-string',
                                            key: 'filter-by-string',
                                            placeholder: 'Search',
                                            value: filterText,
                                            onChange: (_e, value) => {
                                                setFilterText(value);
                                            }
                                        }
                                    }
                                ]
                            } }
                            // pagination={ { ...pagination.props, itemCount: issue.systems.length } }
                            activeFiltersConfig={ activeFiltersConfig }
                        /> */ }
                    </InventoryTable> }
                </div>
            </Modal>
            <ConfirmationDialog
                isOpen={ deleteDialogOpen }
                text={ `Removing the system ${getSystemName(system)} from the action ${issue.description}
                    will remove this system’s remediation from the playbook.` }
                onClose={ value => {
                    setDeleteDialogOpen(false);
                    value && onDelete(remediation.id, issue.id, system.id);
                } } />
        </React.Fragment>
    );

};

SystemsStatusModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    issue: PropTypes.object,
    remediation: PropTypes.object,
    onDelete: PropTypes.func
};
