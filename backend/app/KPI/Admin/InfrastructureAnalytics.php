<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\KPI\Admin;

use App\Chat\Database;

/**
 * Infrastructure Analytics and KPI service for locations, nodes, databases, and allocations.
 */
class InfrastructureAnalytics
{
    /**
     * Get locations overview statistics.
     *
     * @return array Location statistics
     */
    public static function getLocationsOverview(): array
    {
        $pdo = Database::getPdoConnection();

        // Total locations
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_locations');
        $totalLocations = (int) $stmt->fetchColumn();

        // Locations with nodes
        $stmt = $pdo->query('
            SELECT COUNT(DISTINCT location_id) 
            FROM featherpanel_nodes
        ');
        $locationsWithNodes = (int) $stmt->fetchColumn();

        // Locations without nodes
        $emptyLocations = $totalLocations - $locationsWithNodes;

        return [
            'total_locations' => $totalLocations,
            'with_nodes' => $locationsWithNodes,
            'empty_locations' => $emptyLocations,
        ];
    }

    /**
     * Get nodes by location distribution.
     *
     * @return array Node distribution by location
     */
    public static function getNodesByLocation(): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->query('
            SELECT 
                l.id as location_id,
                l.name as location_name,
                COUNT(n.id) as node_count
            FROM featherpanel_locations l
            LEFT JOIN featherpanel_nodes n ON l.id = n.location_id
            GROUP BY l.id, l.name
            ORDER BY node_count DESC
        ');
        $distribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($distribution as &$item) {
            $item['node_count'] = (int) $item['node_count'];
        }

        return [
            'locations' => $distribution,
        ];
    }

    /**
     * Get nodes overview statistics.
     *
     * @return array Node statistics
     */
    public static function getNodesOverview(): array
    {
        $pdo = Database::getPdoConnection();

        // Total nodes
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_nodes');
        $totalNodes = (int) $stmt->fetchColumn();

        // Public nodes
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_nodes WHERE public = 1');
        $publicNodes = (int) $stmt->fetchColumn();

        // Nodes in maintenance
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_nodes WHERE maintenance_mode = 1');
        $maintenanceNodes = (int) $stmt->fetchColumn();

        // Nodes behind proxy
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_nodes WHERE behind_proxy = 1');
        $proxyNodes = (int) $stmt->fetchColumn();

        return [
            'total_nodes' => $totalNodes,
            'public_nodes' => $publicNodes,
            'private_nodes' => $totalNodes - $publicNodes,
            'maintenance_nodes' => $maintenanceNodes,
            'proxy_nodes' => $proxyNodes,
            'percentage_public' => $totalNodes > 0 ? round(($publicNodes / $totalNodes) * 100, 2) : 0,
        ];
    }

    /**
     * Get servers by node distribution.
     *
     * @return array Server distribution by node
     */
    public static function getServersByNode(): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->query('
            SELECT 
                n.id as node_id,
                n.name as node_name,
                n.fqdn,
                l.name as location_name,
                COUNT(s.id) as server_count
            FROM featherpanel_nodes n
            LEFT JOIN featherpanel_servers s ON n.id = s.node_id
            LEFT JOIN featherpanel_locations l ON n.location_id = l.id
            GROUP BY n.id, n.name, n.fqdn, l.name
            ORDER BY server_count DESC
        ');
        $distribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($distribution as &$item) {
            $item['server_count'] = (int) $item['server_count'];
        }

        return [
            'nodes' => $distribution,
        ];
    }

    /**
     * Get node resource allocation statistics.
     *
     * @return array Resource allocation stats
     */
    public static function getNodeResources(): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->query('
            SELECT 
                n.id,
                n.name,
                n.memory,
                n.disk,
                COALESCE(SUM(s.memory), 0) as allocated_memory,
                COALESCE(SUM(s.disk), 0) as allocated_disk,
                COUNT(s.id) as server_count
            FROM featherpanel_nodes n
            LEFT JOIN featherpanel_servers s ON n.id = s.node_id
            GROUP BY n.id, n.name, n.memory, n.disk
            ORDER BY n.name ASC
        ');
        $resources = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($resources as &$item) {
            $item['memory'] = (int) $item['memory'];
            $item['disk'] = (int) $item['disk'];
            $item['allocated_memory'] = (int) $item['allocated_memory'];
            $item['allocated_disk'] = (int) $item['allocated_disk'];
            $item['server_count'] = (int) $item['server_count'];
            $item['memory_usage_percentage'] = $item['memory'] > 0 ? round(($item['allocated_memory'] / $item['memory']) * 100, 2) : 0;
            $item['disk_usage_percentage'] = $item['disk'] > 0 ? round(($item['allocated_disk'] / $item['disk']) * 100, 2) : 0;
        }

        return [
            'nodes' => $resources,
        ];
    }

    /**
     * Get allocation statistics.
     *
     * @return array Allocation statistics
     */
    public static function getAllocationsOverview(): array
    {
        $pdo = Database::getPdoConnection();

        // Total allocations
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_allocations');
        $totalAllocations = (int) $stmt->fetchColumn();

        // Assigned allocations
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_allocations WHERE server_id IS NOT NULL');
        $assignedAllocations = (int) $stmt->fetchColumn();

        // Available allocations
        $availableAllocations = $totalAllocations - $assignedAllocations;

        return [
            'total_allocations' => $totalAllocations,
            'assigned' => $assignedAllocations,
            'available' => $availableAllocations,
            'percentage_used' => $totalAllocations > 0 ? round(($assignedAllocations / $totalAllocations) * 100, 2) : 0,
        ];
    }

    /**
     * Get allocations by node distribution.
     *
     * @return array Allocation distribution by node
     */
    public static function getAllocationsByNode(): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->query('
            SELECT 
                n.id as node_id,
                n.name as node_name,
                COUNT(a.id) as total_allocations,
                SUM(CASE WHEN a.server_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_allocations,
                SUM(CASE WHEN a.server_id IS NULL THEN 1 ELSE 0 END) as available_allocations
            FROM featherpanel_nodes n
            LEFT JOIN featherpanel_allocations a ON n.id = a.node_id
            GROUP BY n.id, n.name
            ORDER BY total_allocations DESC
        ');
        $distribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($distribution as &$item) {
            $item['total_allocations'] = (int) $item['total_allocations'];
            $item['assigned_allocations'] = (int) $item['assigned_allocations'];
            $item['available_allocations'] = (int) $item['available_allocations'];
            $item['usage_percentage'] = $item['total_allocations'] > 0
                ? round(($item['assigned_allocations'] / $item['total_allocations']) * 100, 2)
                : 0;
        }

        return [
            'nodes' => $distribution,
        ];
    }

    /**
     * Get database host statistics.
     *
     * @return array Database host statistics
     */
    public static function getDatabasesOverview(): array
    {
        $pdo = Database::getPdoConnection();

        // Total database hosts
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_databases');
        $totalDatabases = (int) $stmt->fetchColumn();

        // Databases by type
        $stmt = $pdo->query('
            SELECT 
                database_type,
                COUNT(*) as count
            FROM featherpanel_databases
            GROUP BY database_type
            ORDER BY count DESC
        ');
        $byType = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($byType as &$item) {
            $item['count'] = (int) $item['count'];
        }

        // Databases by node
        $stmt = $pdo->query('
            SELECT 
                n.name as node_name,
                COUNT(d.id) as count
            FROM featherpanel_nodes n
            LEFT JOIN featherpanel_databases d ON n.id = d.node_id
            GROUP BY n.id, n.name
            HAVING count > 0
            ORDER BY count DESC
        ');
        $byNode = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($byNode as &$item) {
            $item['count'] = (int) $item['count'];
        }

        return [
            'total_databases' => $totalDatabases,
            'by_type' => $byType,
            'by_node' => $byNode,
        ];
    }

    /**
     * Get comprehensive infrastructure dashboard.
     *
     * @return array Complete infrastructure statistics
     */
    public static function getInfrastructureDashboard(): array
    {
        return [
            'locations' => self::getLocationsOverview(),
            'nodes' => self::getNodesOverview(),
            'allocations' => self::getAllocationsOverview(),
            'databases' => self::getDatabasesOverview(),
            'nodes_by_location' => self::getNodesByLocation(),
            'servers_by_node' => self::getServersByNode(),
            'allocations_by_node' => self::getAllocationsByNode(),
            'node_resources' => self::getNodeResources(),
        ];
    }

    /**
     * Get port usage statistics.
     *
     * @param int $limit Number of most used ports to retrieve (default: 10)
     *
     * @return array Port usage statistics
     */
    public static function getPortUsage(int $limit = 10): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare('
            SELECT 
                port,
                COUNT(*) as count,
                SUM(CASE WHEN server_id IS NOT NULL THEN 1 ELSE 0 END) as assigned,
                SUM(CASE WHEN server_id IS NULL THEN 1 ELSE 0 END) as available
            FROM featherpanel_allocations
            GROUP BY port
            ORDER BY count DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        $ports = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($ports as &$item) {
            $item['port'] = (int) $item['port'];
            $item['count'] = (int) $item['count'];
            $item['assigned'] = (int) $item['assigned'];
            $item['available'] = (int) $item['available'];
        }

        return [
            'limit' => $limit,
            'ports' => $ports,
        ];
    }

    /**
     * Get IP address usage statistics.
     *
     * @param int $limit Number of most used IPs to retrieve (default: 10)
     *
     * @return array IP usage statistics
     */
    public static function getIpUsage(int $limit = 10): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->prepare('
            SELECT 
                ip,
                COUNT(*) as total_ports,
                SUM(CASE WHEN server_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_ports,
                SUM(CASE WHEN server_id IS NULL THEN 1 ELSE 0 END) as available_ports
            FROM featherpanel_allocations
            GROUP BY ip
            ORDER BY total_ports DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        $ips = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($ips as &$item) {
            $item['total_ports'] = (int) $item['total_ports'];
            $item['assigned_ports'] = (int) $item['assigned_ports'];
            $item['available_ports'] = (int) $item['available_ports'];
            $item['usage_percentage'] = $item['total_ports'] > 0
                ? round(($item['assigned_ports'] / $item['total_ports']) * 100, 2)
                : 0;
        }

        return [
            'limit' => $limit,
            'ips' => $ips,
        ];
    }
}
