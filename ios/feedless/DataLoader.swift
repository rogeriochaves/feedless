//
//  DataLoader.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import Foundation

var fetchingScheduled : Set<String> = Set()

func dataLoad<T: Decodable>(path: String, query: String = "", type: T.Type, context: Context, completionHandler: @escaping (ServerData<T>) -> Void) {
    guard let encodedPath = path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) else { return }
    guard let url = URL(string: "http://127.0.0.1:3000\(encodedPath)\(query)") else { return }

    let request = URLRequest(url: url)
    dataTask(request, type, context, false, completionHandler)
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


// From: https://stackoverflow.com/a/32904778/996404
func generateBoundaryString() -> String {
    return "Boundary-\(NSUUID().uuidString)"
}

extension Data {
  mutating func append(_ string: String) {
    let data = string.data(
        using: String.Encoding.utf8,
        allowLossyConversion: true)
    append(data!)
  }
}

import SwiftUI
func dataPostMultipart<T: Decodable>(path: String, image: UIImage?, parameters: [String: String], type: T.Type, context: Context, waitForIndexing: Bool = true, completionHandler: @escaping (ServerData<T>) -> Void) {
    guard let encodedPath = path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) else { return }
    guard let url = URL(string: "http://127.0.0.1:3000\(encodedPath)") else { return }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"

    let boundary = generateBoundaryString()
    request.addValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

    let imageData = image?.jpegData(compressionQuality: 1)
    request.httpBody = createBodyWithParameters(parameters: parameters, filePathKey: "pic", imageDataKey: imageData, boundary: boundary)

    request.addValue("application/json", forHTTPHeaderField: "Accept")
    dataTask(request, type, context, waitForIndexing, completionHandler)
}

func createBodyWithParameters(parameters: [String: String]?, filePathKey: String?, imageDataKey: Data?, boundary: String) -> Data {
    var body = Data()

    if parameters != nil {
        for (key, value) in parameters! {
            body.append("--\(boundary)\r\n")
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n")
            body.append("\(value)\r\n")
        }
    }

    if let imageData = imageDataKey {
        let filename = "user-profile.jpg"
        let mimetype = "image/jpg"
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"\(filePathKey!)\"; filename=\"\(filename)\"\r\n")
        body.append("Content-Type: \(mimetype)\r\n\r\n")
        body.append(imageData)
        body.append("\r\n")
    }

    body.append("--\(boundary)--\r\n")

    return body
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

        let isConnecting = context.status == .initializing || context.status == .connecting
        let isIndexing = context.indexing.current < context.indexing.target
        if isConnecting || (waitForIndexing && isIndexing) {
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
