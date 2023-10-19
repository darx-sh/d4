import {
  type HttpRoute,
  useProjectState,
} from "~/components/project/ProjectContext";
import { useState } from "react";
import InvokeModal from "~/components/project/playground/InvokeModal";

export default function HttpEndpoints() {
  const projectState = useProjectState();
  const [invokingHttpRoute, setInvokingHttpRoute] = useState<HttpRoute | null>(
    null
  );

  const tabIdx = projectState.curOpenTabIdx;
  if (tabIdx === null) {
    return null;
  }

  const curOpenTab = projectState.tabs[tabIdx];
  if (curOpenTab === undefined || curOpenTab.type !== "JsEditor") {
    return null;
  }

  const curCode = projectState.directory.codes[curOpenTab.codeIdx]!;
  const httpRoutes = projectState.directory.httpRoutes.filter((route) => {
    return route.jsEntryPoint === curCode.fsPath;
  });

  if (httpRoutes.length === 0) {
    return null;
  }

  const handleInvoke = (route: HttpRoute) => {
    setInvokingHttpRoute(route);
  };

  const handleCloseInvokeModal = () => {
    setInvokingHttpRoute(null);
  };

  return (
    <>
      {invokingHttpRoute !== null && (
        <InvokeModal
          httpRoute={invokingHttpRoute}
          onClose={handleCloseInvokeModal}
        ></InvokeModal>
      )}

      <div className="mt-10 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">
              Http Endpoints
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Generated http endpoint.
            </p>
          </div>
        </div>
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden rounded shadow ring-1 ring-black ring-opacity-5">
                <table className="min-w-full divide-y divide-gray-300">
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {httpRoutes.map((route) => (
                      <tr key={route.httpPath}>
                        <td className="font-base whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                          {"/" + route.httpPath}
                        </td>
                        <td className="font-base relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm sm:pr-6">
                          <a
                            href="#"
                            className="text-indigo-600 hover:text-indigo-900"
                            onClick={() => {
                              // use projectState to fetch newest data.
                              const r =
                                projectState.directory.httpRoutes.filter(
                                  (r) => {
                                    return r.httpPath === route.httpPath;
                                  }
                                )[0]!;
                              handleInvoke(r);
                            }}
                          >
                            Invoke
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
