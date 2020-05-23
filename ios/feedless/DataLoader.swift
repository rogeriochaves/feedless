//
//  DataLoader.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import Foundation

var fetchingScheduled : Set<String> = Set()

func dataLoad<T: Decodable>(path: String, type: T.Type, context: Context, completionHandler: @escaping (ServerData<T>) -> Void) {
    let url = URL(string: "http://127.0.0.1:3000\(path)")!

    let request = URLRequest(url: url)
    dataTask(request, type, context, completionHandler)
}

func dataPost<T: Decodable>(path: String, parameters: [String: Any], type: T.Type, context: Context, completionHandler: @escaping (ServerData<T>) -> Void) {
    let url = URL(string: "http://127.0.0.1:3000\(path)")!

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    request.addValue("application/json", forHTTPHeaderField: "Accept")
    do {
        request.httpBody = try JSONSerialization.data(withJSONObject: parameters, options: .prettyPrinted)
    } catch let error {
        print(error.localizedDescription)
    }

    dataTask(request, type, context, completionHandler)
}

private func dataTask<T: Decodable>(_ request: URLRequest, _ type: T.Type, _ context: Context, _ completionHandler: @escaping (ServerData<T>) -> Void) {
    let identifier = "\(request.httpMethod ?? "GET") \(request.url?.path ?? "")"

    let config = URLSessionConfiguration.default
    config.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
    let session = URLSession(configuration: config)

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
                print("\(identifier): Error loading posts \(error)")
                completionHandler(.error("\(error)"))
            }
        } else {
            print("\(identifier): No data")
            completionHandler(.error("No data"))
        }
    }

    URLCache.shared.getCachedResponse(for: task) {
        (response) in

        if let rawData = response?.data {
            print("\(identifier): Cache hit");
            do {
                try decode(rawData)
            } catch {
                print("\(identifier): Error parsing cache");
            }
        } else {
            print("\(identifier): Cache miss");
        }

        if context.status == .initializing || context.status == .indexing || context.indexing.current < context.indexing.target {
            if (!fetchingScheduled.contains(identifier)) {
                fetchingScheduled.insert(identifier)

                print("\(identifier): Server still indexing, postponing fetch");
                DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                    fetchingScheduled.remove(identifier)
                    dataTask(request, type, context, completionHandler)
                }
            }
        } else {
            print("\(identifier): Going to server");
            task.resume();
        }
    }
}
