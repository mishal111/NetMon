import { useState, useEffect } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '150',
  'elk.spacing.nodeNode': '150',
  'elk.direction': 'RIGHT',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
};

export default function useNetworkLayout(initialNodes, initialEdges, useHierarchical) {
  const [layoutedNodes, setLayoutedNodes] = useState([]);
  const [layoutedEdges, setLayoutedEdges] = useState([]);
  const [isComputing, setIsComputing] = useState(false);

  useEffect(() => {
    if (!initialNodes.length) return;

    if (!useHierarchical) {
      // Just use the provided positions (random)
      setLayoutedNodes(initialNodes);
      setLayoutedEdges(initialEdges);
      return;
    }

    const calculateLayout = async () => {
      setIsComputing(true);
      
      const graph = {
        id: 'root',
        layoutOptions: elkOptions,
        children: initialNodes.map((node) => ({
          ...node,
          // Assign dimensions for ELK to calculate spacing properly
          width: 150,
          height: 40,
        })),
        edges: initialEdges.map((edge) => ({
          ...edge,
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      };

      try {
        const layoutedGraph = await elk.layout(graph);
        
        const nextNodes = initialNodes.map((node) => {
          const layoutNode = layoutedGraph.children.find(n => n.id === node.id);
          return {
            ...node,
            position: {
              x: layoutNode.x,
              y: layoutNode.y,
            },
          };
        });

        setLayoutedNodes(nextNodes);
        setLayoutedEdges(initialEdges); // ELK modifies edge routing too if we wanted, but we'll let ReactFlow draw straight lines
      } catch (err) {
        console.error("ELK Layout Error:", err);
        // Fallback
        setLayoutedNodes(initialNodes);
        setLayoutedEdges(initialEdges);
      } finally {
        setIsComputing(false);
      }
    };

    calculateLayout();

  }, [initialNodes, initialEdges, useHierarchical]); // Re-run when input data changes

  return { layoutedNodes, layoutedEdges, isComputing };
}
