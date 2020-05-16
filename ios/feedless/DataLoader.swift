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

    let config = URLSessionConfiguration.default
    config.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
    let session = URLSession(configuration: config)

    func decode(_ rawData: Data) throws {
        let decodedData = try JSONDecoder().decode(type, from: rawData)
        DispatchQueue.main.async {
            completionHandler(.success(decodedData))
        }
    }

    let task = session.dataTask(with: url) {(data, response, error) in
        if let rawData = data {
            do {
                try decode(rawData)
            } catch {
                print("\(path): Error loading posts \(error)")
                completionHandler(.error("\(error)"))
            }
        } else {
            print("\(path): No data")
            completionHandler(.error("No data"))
        }
    }

    URLCache.shared.getCachedResponse(for: task) {
        (response) in

        if let rawData = response?.data {
            print("\(path): Cache hit");
            do {
                try decode(rawData)
            } catch {
                print("\(path): Error parsing cache");
            }
        } else {
            print("\(path): Cache miss");
        }

        if context.status == .initializing || context.status == .indexing || context.indexing.current < context.indexing.target {
            if (!fetchingScheduled.contains(path)) {
                fetchingScheduled.insert(path)

                print("\(path): Server still indexing, postponing fetch");
                DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                    fetchingScheduled.remove(path)
                    dataLoad(path: path, type: type, context: context, completionHandler: completionHandler)
                }
            }
        } else {
            print("\(path): Going to server");
            task.resume();
        }
    }
}
