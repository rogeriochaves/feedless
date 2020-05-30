//
//  DataLoader.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import Foundation

var fetchingScheduled : Set<String> = Set()

func dataLoad<T: Decodable>(path: String, query: String = "", type: T.Type, context: Context, waitForIndexing: Bool = true, completionHandler: @escaping (ServerData<T>) -> Void) {
    guard let encodedPath = path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) else { return }
    guard let url = URL(string: "http://127.0.0.1:3000\(encodedPath)\(query)") else { return }

    let request = URLRequest(url: url)
    dataTask(request, type, context, waitForIndexing, completionHandler)
}

func dataPost<T: Decodable>(path: String, parameters: [String: Any], type: T.Type, context: Context, waitForIndexing: Bool = true, completionHandler: @escaping (ServerData<T>) -> Void) {
    guard let encodedPath = path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) else { return }
    guard let url = URL(string: "http://127.0.0.1:3000\(encodedPath)") else { return }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    request.addValue("application/json", forHTTPHeaderField: "Accept")
    do {
        request.httpBody = try JSONSerialization.data(withJSONObject: parameters, options: .prettyPrinted)
    } catch let error {
        Utils.debug(error.localizedDescription)
    }

    dataTask(request, type, context, waitForIndexing, completionHandler)
}

private func dataTask<T: Decodable>(_ request: URLRequest, _ type: T.Type, _ context: Context, _ waitForIndexing: Bool, _ completionHandler: @escaping (ServerData<T>) -> Void) {
    let identifier = "\(request.httpMethod ?? "GET") \(request.url?.path ?? "")"

    let session = Utils.session

    func decode(_ rawData: Data) throws {
        let decodedData = try JSONDecoder().decode(type, from: rawData)
        DispatchQueue.main.async {
            completionHandler(.success(decodedData))
        }
    }

    let task = session.dataTask(with: request) {(data, response, error) in
        if let rawData = data {
            do {
                try decode(rawData)
            } catch {
                Utils.debug("\(identifier): Error loading posts \(error)")
                completionHandler(.error("\(error)"))
            }
        } else {
            Utils.debug("\(identifier): No data")
            completionHandler(.error("No data"))
        }
    }

    URLCache.shared.getCachedResponse(for: task) {
        (response) in

        if let rawData = response?.data {
            Utils.debug("\(identifier): Cache hit");
            do {
                try decode(rawData)
            } catch {
                Utils.debug("\(identifier): Error parsing cache");
            }
        } else {
            Utils.debug("\(identifier): Cache miss");
        }

        if waitForIndexing && (context.status == .initializing || context.status == .indexing || context.indexing.current < context.indexing.target) {
            if (!fetchingScheduled.contains(identifier)) {
                fetchingScheduled.insert(identifier)

                Utils.debug("\(identifier): Server still indexing, postponing fetch");
                DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                    fetchingScheduled.remove(identifier)
                    dataTask(request, type, context, waitForIndexing, completionHandler)
                }
            }
        } else {
            Utils.debug("\(identifier): Going to server");
            task.resume()
        }
    }
}
