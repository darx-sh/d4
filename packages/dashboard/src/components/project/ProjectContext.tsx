import {
  createContext,
  useContext,
  type ReactNode,
  type Dispatch,
} from "react";
import { useImmerReducer } from "use-immer";
import { INode, NodeId } from "~/components/react-tree-view";
import md5 from "crypto-js/md5";

type ProjectState = {
  directory: {
    codes: CodeInfo[];
    httpRoutes: HttpRoute[];
    treeViewData: INode[];
  };

  tabs: Tab[];
  curOpenTabIdx: number | null;
  projectInfo: ProjectInfo | null;
  envInfo: EnvInfo | null;
  curNav: NavType;
};

export interface CodeInfo {
  fsPath: string;
  content: string;
  prevChecksum?: string;
  curChecksum?: string;
}

export type NavType =
  | "database"
  | "playground"
  | "functions"
  | "metrics"
  | "logs"
  | "secrets";

export type ProjectInfo = {
  id: string;
  name: string;
};

export type EnvInfo = {
  id: string;
  name: string;
};

export type HttpRoute = {
  jsEntryPoint: string;
  jsExport: string;
  httpPath: string;
  method: string;
  curParams: string;
};

type Tab = { type: "JsEditor"; codeIdx: number };

export const initialHttpParam = JSON.stringify({}, null, 2);

const initialProject: ProjectState = {
  directory: {
    codes: [],
    httpRoutes: [],
    treeViewData: [],
  },
  tabs: [],
  curOpenTabIdx: null,
  projectInfo: null,
  envInfo: null,
  curNav: "database",
};

type ProjectAction =
  | {
      type: "LoadEnv";
      codes: { fsPath: string; content: string }[];
      httpRoutes: HttpRoute[];
      projectInfo: ProjectInfo;
      envInfo: EnvInfo;
    }
  | { type: "PersistedCode"; checksums: CodeChecksums; httpRoutes: HttpRoute[] }
  | { type: "NewJsFile"; parentNodeId: NodeId; fileName: string }
  | { type: "OpenJsFile"; nodeId: NodeId }
  | { type: "UpdateJsFile"; codeIdx: number; content: string }
  | { type: "CloseTab"; tabIdx: number }
  | { type: "SelectTab"; tabIdx: number }
  | { type: "UpdatePostParam"; httpRoute: HttpRoute; param: string }
  | { type: "NavToDatabase" }
  | { type: "NavToPlayground" }
  | { type: "NavToFunctions" };

export type CodeChecksums = {
  [key: string]: string;
};

const ProjectStateContext = createContext<ProjectState | null>(null);
const ProjectDispatchContext = createContext<Dispatch<ProjectAction> | null>(
  null
);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectState, projectDispatch] = useImmerReducer(
    projectReducer,
    initialProject
  );
  return (
    <ProjectStateContext.Provider value={projectState}>
      <ProjectDispatchContext.Provider value={projectDispatch}>
        {children}
      </ProjectDispatchContext.Provider>
    </ProjectStateContext.Provider>
  );
}

export function useProjectState() {
  return useContext(ProjectStateContext)!;
}

export function useProjectDispatch() {
  return useContext(ProjectDispatchContext)!;
}

function initialEditorCode(fsPath: string) {
  return `\
export default function foo() {
  return "hello from ${fsPath}";
}
  `;
}

function projectReducer(
  state: ProjectState,
  action: ProjectAction
): ProjectState {
  switch (action.type) {
    case "LoadEnv": {
      const codes = action.codes.map((c) => {
        const digest = md5(c.content).toString();
        return {
          ...c,
          prevChecksum: digest,
          curChecksum: digest,
        };
      });
      state.projectInfo = action.projectInfo;
      state.envInfo = action.envInfo;
      state.directory.codes = codes;
      state.directory.httpRoutes = action.httpRoutes;
      state.directory.treeViewData = buildTreeViewData(state.directory.codes);
      return state;
    }
    case "PersistedCode": {
      state.directory.codes = state.directory.codes.map((c) => {
        const checksum = action.checksums[c.fsPath];
        if (checksum) {
          return { ...c, prevChecksum: checksum };
        } else {
          return c;
        }
      });
      state.directory.httpRoutes = action.httpRoutes;
      return state;
    }
    case "NewJsFile": {
      const fsPath = newFsPath(action.parentNodeId, action.fileName);
      const content = initialEditorCode(fsPath);
      state.directory.codes.push({
        fsPath,
        content: content,
        curChecksum: md5(content).toString(),
      });
      state.directory.treeViewData = buildTreeViewData(state.directory.codes);
      // create a new tab
      state.tabs.push({
        type: "JsEditor",
        codeIdx: state.directory.codes.length - 1,
      });
      state.curOpenTabIdx = state.tabs.length - 1;
      return state;
    }
    case "OpenJsFile": {
      const fsPath = nodeIdToFsPath(action.nodeId);
      const codeIdx = state.directory.codes.findIndex(
        (c) => c.fsPath === fsPath
      );
      if (codeIdx < 0) {
        throw new Error(
          `Cannot find code with fsPath: ${fsPath}, nodeId: ${action.nodeId}`
        );
      }

      const tabIdx = state.tabs.findIndex(
        (t) => t.type === "JsEditor" && t.codeIdx === codeIdx
      );
      if (tabIdx >= 0) {
        // we already find the tab, just select it.
        state.curOpenTabIdx = tabIdx;
      } else {
        // create a new tab.
        state.tabs.push({ type: "JsEditor", codeIdx: codeIdx });
        state.curOpenTabIdx = state.tabs.length - 1;
      }
      return state;
    }
    case "UpdateJsFile": {
      state.directory.codes[action.codeIdx]!.content = action.content;
      state.directory.codes[action.codeIdx]!.curChecksum = md5(
        action.content
      ).toString();
      return state;
    }
    case "SelectTab": {
      state.curOpenTabIdx = action.tabIdx;
      return state;
    }
    case "CloseTab": {
      const idx = action.tabIdx;
      state.tabs.splice(idx, 1);
      if (state.tabs.length === 0) {
        state.curOpenTabIdx = null;
        return state;
      }

      if (state.curOpenTabIdx !== null) {
        if (state.curOpenTabIdx > idx) {
          state.curOpenTabIdx = state.curOpenTabIdx - 1;
        }
      }
      return state;
    }
    case "UpdatePostParam": {
      const { httpRoute, param } = action;
      const idx = state.directory.httpRoutes.findIndex((r) => {
        return (
          r.httpPath === httpRoute.httpPath && r.method === httpRoute.method
        );
      });
      if (idx >= 0) {
        state.directory.httpRoutes[idx]!.curParams = param;
      }
      return state;
    }
    case "NavToDatabase": {
      state.curNav = "database";
      return state;
    }
    case "NavToPlayground": {
      state.curNav = "playground";
      return state;
    }
    case "NavToFunctions": {
      state.curNav = "functions";
      return state;
    }
  }
}

function buildTreeViewData(
  codes: { fsPath: string; content: string }[]
): INode[] {
  const rootNode: INode = {
    id: "/",
    name: "",
    parent: null,
    children: [],
  };

  const nodeList = [rootNode];

  function getFileName(filePath: string): string {
    return filePath.split("/").pop() || "";
  }

  // build all directory nodes
  for (const code of codes) {
    const filePath = code.fsPath;
    if (filePath.lastIndexOf("/") > 0) {
      const dirPath = filePath.slice(0, filePath.lastIndexOf("/"));
      const dirNames = dirPath.split("/");

      let currentNode = rootNode;
      let currentDirPath = "";
      for (const dirName of dirNames) {
        currentDirPath += "/" + dirName;

        const existingDirNode = nodeList.find(
          (node) => node.id === currentDirPath
        );

        if (!existingDirNode) {
          const newDirNode: INode = {
            id: currentDirPath,
            name: dirName,
            parent: currentNode.id,
            children: [],
            isBranch: true,
          };
          currentNode = newDirNode;
          nodeList.push(currentNode);
        } else {
          currentNode = existingDirNode;
        }
      }
      // add current file
      const fileName = getFileName(filePath);
      const newFileNode: INode = {
        id: currentDirPath + "/" + fileName,
        name: fileName,
        parent: currentNode.id,
        children: [],
        isBranch: false,
      };
      nodeList.push(newFileNode);
    } else {
      // file in root directory
      const fileName = getFileName(filePath);
      const newFileNode: INode = {
        id: "/" + fileName,
        name: fileName,
        parent: rootNode.id,
        children: [],
        isBranch: false,
      };
      nodeList.push(newFileNode);
    }
  }

  if (codes.length === 0) {
    nodeList.push({
      id: "/functions",
      name: "functions",
      parent: "/",
      children: [],
      isBranch: true,
    });
  }

  // build parent-child relationship between directory nodes,
  // since the "parent" field is already set, we only need
  // to set the "children" field.
  for (const node of nodeList) {
    if (node.parent) {
      const parentNode = nodeList.find((n) => n.id === node.parent);
      if (parentNode) {
        parentNode.children.push(node.id);
      } else {
        throw new Error("parent node not found");
      }
    }
  }
  return nodeList;
}

function nodeIdToFsPath(nodeId: NodeId): string {
  const id = nodeId as string;
  if (id.startsWith("/")) {
    return id.replace("/", "");
  } else {
    throw new Error(`invalid nodeId: ${nodeId}`);
  }
}

function newFsPath(parentNodeId: NodeId, fileName: string): string {
  const parentId = parentNodeId as string;
  if (parentId.startsWith("/")) {
    return parentId.replace("/", "") + "/" + fileName;
  } else {
    throw new Error(`invalid parentNodeId: ${parentNodeId}`);
  }
}
